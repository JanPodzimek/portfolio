// Checks the permission rules in .claude/settings.json: every command the skills and agents
// tell Claude to run is allowed (so the automated flow never stops at a prompt), and the
// destructive gh commands are denied. The matcher approximates Claude Code's `Bash(<pattern>)`
// rules (`*` matches anything; each part of an `&&` chain is checked on its own). The rules are
// a safety net, not a security boundary (see docs/agentic-workflow.md).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { commandsIn, docs, root, text } from './skillDocs';

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
const permitted = (command: string) =>
  command
    .split(/&&|\|\||;/)
    .map((part) => part.trim())
    .every((part) => matches(allow, part) && !matches(deny, part));

/** The deployment lookup the release gate used to run as a raw `gh api` call. */
const query = 'repos/JanPodzimek/portfolio/deployments?environment=Production&sha=x';
const sha = '0123456789abcdef0123456789abcdef01234567';

const documented = docs.flatMap((file) =>
  commandsIn(text(file)).map((command) => ({ file, command })),
);

describe('.claude/settings.json permissions', () => {
  it('finds the commands in the skills', () => {
    expect(documented.length).toBeGreaterThan(30);
    expect(documented.map((d) => d.command)).toContain('git push origin v1.2.3');
    expect(documented.map((d) => d.command)).toContain('npm run verify');
    expect(documented.map((d) => d.command)).toContain('node scripts/deployment-state.mjs x');
  });

  // Auto mode refuses `sleep` loops, so every wait must be a blocking command such as
  // `gh pr checks --watch` or `gh run watch`, never "poll every N s".
  it.each(docs)('%s: waits only with blocking commands, never sleep', (file) => {
    for (const { command } of documented.filter((d) => d.file === file)) {
      expect(command).not.toMatch(/(^|[\s;|(])sleep\b/);
    }
    expect(text(file)).not.toMatch(/poll every/i);
    // Inline `sleep 30` anywhere in the text; a bare `sleep` mention is fine.
    expect(text(file)).not.toMatch(/`\s*sleep\s[^`]*`/);
  });

  it('documents the blocking waits', () => {
    const commands = documented.map((d) => d.command);
    expect(commands).toContain('gh pr checks --watch --required -i 15');
    expect(commands).toContain('gh pr checks x --watch --required -i 15');
    expect(commands).toContain('gh run watch x --exit-status');
  });

  it('makes every `gh run watch` fail on a red run', () => {
    const watches = documented.filter((d) => d.command.startsWith('gh run watch'));
    expect(watches.length).toBeGreaterThan(0);
    for (const { command } of watches) expect(command).toMatch(/--exit-status/);
  });

  it.each(documented)('$file: `$command` is allowed and not denied', ({ command }) => {
    expect(permitted(command)).toBe(true);
  });

  // gh groups short flags (`-iXPOST`, `-if ref=main`), so no glob rule can tell a read from a
  // write. `gh api` is therefore denied outright; the one read the release gate needs lives in
  // scripts/deployment-state.mjs, which only takes a validated commit sha.
  it('documents no raw `gh api` command', () => {
    expect(documented.filter((d) => /^gh api\b/.test(d.command))).toEqual([]);
  });

  it('allows the deployment-state script for a commit sha', () => {
    expect(permitted(`node scripts/deployment-state.mjs ${sha}`)).toBe(true);
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
    // Every gh api call is denied: any method in any case, quoting or spacing, grouped short
    // flags, and the former read-only lookups themselves.
    `gh api '${query}' -q '.[0].id'`,
    `gh api repos/JanPodzimek/portfolio/deployments/1/statuses -q '.[0].state'`,
    `gh api '${query}' -q . -iXPOST`,
    `gh api '${query}' -q . -if ref=main`,
    'gh api repos/JanPodzimek/portfolio/deployments/1/statuses -q . -iF state=success',
    `gh api '${query}' -q '.[0].id' -X Post`,
    `gh api '${query}' -q . -X pAtCh`,
    `gh api '${query}' -q . --method=Delete`,
    `gh api '${query}' -q . -XPut`,
    `gh api '${query}' -q . -X=pOsT`,
    `gh api '${query}' -q . --method dElEtE`,
    'gh api repos/JanPodzimek/portfolio/deployments -X GET -X Post -f ref=main',
    `gh api '${query}' -q . -X 'POST'`,
    `gh api '${query}' -q . -X  POST`,
    `gh api '${query}' -q . -X "Delete"`,
    `gh api '${query}' -q . --method  put`,
    'gh api repos/JanPodzimek/portfolio/deployments -X GET',
    'gh api repos/JanPodzimek/portfolio/deployments -XGET',
    'gh api repos/JanPodzimek/portfolio/deployments --method=get',
    // Fields on deployments, with and without a space.
    `gh api '${query}' -q . -f ref=main`,
    'gh api repos/JanPodzimek/portfolio/deployments -fref=main',
    'gh api repos/JanPodzimek/portfolio/deployments -Fref=main',
    'gh api repos/JanPodzimek/portfolio/deployments --field=ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments --raw-field ref=main',
    'gh api repos/JanPodzimek/portfolio/deployments --input body.json',
    'gh api repos/JanPodzimek/portfolio/deployments/1/statuses -q . -fstate=success',
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
    'gh api graphql -f query=x',
    `gh api '${query}' -q '.[0].id'`,
    // The script is allowed, but not chained with other commands after it.
    `node scripts/deployment-state.mjs ${sha} && gh api repos/JanPodzimek/portfolio -X DELETE`,
    'node scripts/other.mjs x',
    'git push origin main',
    'git push -u origin chore/x',
    // No skill runs curl (the "Production smoke" workflow checks production), so none is allowed.
    'curl -sI https://example.com/',
    'curl -sI https://portfolio-v2-sigma-two.vercel.app/',
    'curl -sI https://portfolio-v2-sigma-two.vercel.app/cs/',
  ])('does not allow `%s` without a prompt', (command) => {
    expect(permitted(command)).toBe(false);
  });
});
