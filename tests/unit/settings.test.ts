// Checks the permission rules in .claude/settings.json against the exact commands the skills
// run. The matcher approximates Claude Code's `Bash(<pattern>)` rules (`*` matches anything);
// the rules are a safety net, not a security boundary (see docs/agentic-workflow.md).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const settings = JSON.parse(
  readFileSync(new URL('../../.claude/settings.json', import.meta.url), 'utf8'),
) as { permissions: { allow: string[]; deny: string[] } };

function bashPatterns(rules: string[]) {
  return rules
    .map((rule) => /^Bash\((.*)\)$/.exec(rule)?.[1])
    .filter((p): p is string => p !== undefined)
    .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`));
}

const allow = bashPatterns(settings.permissions.allow);
const deny = bashPatterns(settings.permissions.deny);
const matches = (patterns: RegExp[], command: string) => patterns.some((p) => p.test(command));

describe('.claude/settings.json permissions', () => {
  it.each([
    'gh pr create --base develop --fill',
    'gh pr comment --body-file review.md',
    'gh pr merge --squash --auto --delete-branch',
    'gh pr checks --watch',
    'gh pr view --json state -q .state',
    'gh pr create --base rc/v1.1.0 --head develop --title "Release v1.1.0" --body-file changes.md',
    'gh pr merge 12 --merge --auto',
    'gh pr update-branch 12',
    'gh pr list --base develop --state merged --limit 100 --json number,title,headRefName,mergeCommit',
    'gh run list --branch develop --limit 1 --json conclusion,headSha',
    "gh api repos/JanPodzimek/portfolio/deployments -X GET -f environment=Production -f sha=abc -q '.[0].id'",
    "gh api repos/JanPodzimek/portfolio/deployments/123/statuses -q '.[0].state'",
    'git tag v1.1.0 origin/main',
    'git fetch origin',
  ])('allows `%s` and does not deny it', (command) => {
    expect(matches(allow, command)).toBe(true);
    expect(matches(deny, command)).toBe(false);
  });

  it.each([
    'gh repo delete JanPodzimek/portfolio --yes',
    'gh repo edit --default-branch main',
    'gh repo rename other',
    'gh repo archive',
    'gh api repos/JanPodzimek/portfolio -X DELETE',
    'gh api -X DELETE repos/JanPodzimek/portfolio/git/refs/heads/develop',
    'gh api --method DELETE repos/JanPodzimek/portfolio/deployments/1',
    'gh api repos/JanPodzimek/portfolio/deployments/1 -XDELETE',
    'gh api repos/JanPodzimek/portfolio/deployments/1 --method=DELETE',
    'gh api repos/JanPodzimek/portfolio/rulesets',
    'gh api -X PUT repos/JanPodzimek/portfolio/branches/main/protection',
    'gh auth refresh -s admin:org',
    'gh secret set TOKEN',
    'gh release delete v1.0.0',
    'git push --force origin feat/x',
    'git reset --hard origin/main',
  ])('denies `%s`', (command) => {
    expect(matches(deny, command)).toBe(true);
  });
});
