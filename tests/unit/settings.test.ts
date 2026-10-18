// Checks the permission rules in .claude/settings.json: every command the skills and agents
// tell Claude to run is allowed (so the automated flow never stops at a prompt), and the
// destructive gh commands are denied. The matcher approximates Claude Code's `Bash(<pattern>)`
// rules (`*` matches anything; each part of an `&&` chain is checked on its own). The rules are
// a safety net, not a security boundary (see docs/agentic-workflow.md).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const settings = JSON.parse(readFileSync(new URL('.claude/settings.json', root), 'utf8')) as {
  permissions: { allow: string[]; deny: string[] };
};

function bashPatterns(rules: string[]) {
  return rules
    .map((rule) => /^Bash\((.*)\)$/.exec(rule)?.[1])
    .filter((p): p is string => p !== undefined)
    .map((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`));
}

const allow = bashPatterns(settings.permissions.allow);
const deny = bashPatterns(settings.permissions.deny);
const matches = (patterns: RegExp[], command: string) => patterns.some((p) => p.test(command));
const permitted = (command: string) => matches(allow, command) && !matches(deny, command);

/** Placeholders in the docs become sample values: `<slug>` → `x`, `vX.Y.Z` → `v1.2.3`. */
const concrete = (command: string) =>
  command
    .replace(/vX\.Y\.Z/g, 'v1.2.3')
    .replace(/<[^>]+>/g, 'x')
    .trim();

/** Commands in fenced `sh` blocks and inline code starting with git/gh/curl, split on `&&`. */
function commandsIn(markdown: string): string[] {
  const commands: string[] = [];
  for (const [, block] of markdown.matchAll(/```sh\n([\s\S]*?)```/g)) {
    for (const line of block.split('\n')) {
      const command = line.replace(/\s+#\s.*$/, '').trim();
      if (command) commands.push(command);
    }
  }
  for (const [, inline] of markdown.matchAll(/`((?:git|gh|curl) [^`]+)`/g)) commands.push(inline);
  return commands.flatMap((c) => c.split('&&')).map(concrete);
}

const docs = [
  ...readdirSync(new URL('.claude/skills/', root)).map((d) => `.claude/skills/${d}/SKILL.md`),
  ...readdirSync(new URL('.claude/agents/', root)).map((f) => `.claude/agents/${f}`),
];
const documented = docs.flatMap((file) =>
  commandsIn(readFileSync(new URL(file, root), 'utf8')).map((command) => ({ file, command })),
);

describe('.claude/settings.json permissions', () => {
  it('finds the commands in the skills', () => {
    expect(documented.length).toBeGreaterThan(30);
    expect(documented.map((d) => d.command)).toContain('git push origin v1.2.3');
  });

  it.each(documented)('$file: `$command` is allowed and not denied', ({ command }) => {
    expect(permitted(command)).toBe(true);
  });

  it('keeps the gh api deployment calls read-only', () => {
    for (const { command } of documented.filter((d) => d.command.startsWith('gh api'))) {
      expect(command).toMatch(/deployments/);
      if (/\s-[fF]\s|--(raw-)?field/.test(command)) expect(command).toMatch(/-X GET/);
    }
  });

  it.each([
    'gh repo delete JanPodzimek/portfolio --yes',
    'gh repo edit --default-branch main',
    'gh repo rename other',
    'gh repo archive',
    'gh api repos/JanPodzimek/portfolio -X DELETE',
    'gh api -X DELETE repos/JanPodzimek/portfolio/git/refs/heads/develop',
    'gh api -X=DELETE repos/JanPodzimek/portfolio/git/refs/tags/v1.0.0',
    'gh api --method DELETE repos/JanPodzimek/portfolio/deployments/1',
    'gh api --method delete repos/JanPodzimek/portfolio/deployments/1',
    'gh api repos/JanPodzimek/portfolio/deployments/1 -XDELETE',
    'gh api repos/JanPodzimek/portfolio/deployments/1 --method=DELETE',
    'gh api repos/JanPodzimek/portfolio/deployments -X POST -f ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments -X GET -X POST -f ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments -X=POST -f ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments --method POST -f ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments --method post -f ref=main',
    'gh api repos/JanPodzimek/portfolio -X PATCH -f default_branch=main',
    'gh api repos/JanPodzimek/portfolio/deployments/1/statuses -q . -f state=success',
    'gh api repos/JanPodzimek/portfolio/deployments/1/statuses --input status.json',
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

  it.each([
    'gh api repos/JanPodzimek/portfolio/deployments -f ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments/1/statuses -f state=success',
    'gh api repos/JanPodzimek/portfolio/rulesets -X GET',
    'git push origin main',
    'git push -u origin chore/x',
    'curl -sI https://example.com/',
  ])('does not allow `%s` without a prompt', (command) => {
    expect(permitted(command)).toBe(false);
  });
});
