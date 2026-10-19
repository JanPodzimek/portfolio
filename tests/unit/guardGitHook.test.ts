// End-to-end check of the PreToolUse hook script: real node process, JSON on stdin, real git
// repository for the current branch. The policy itself is covered in gitPolicy.test.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = fileURLToPath(new URL('../../.claude/hooks/guard-git.mjs', import.meta.url));

let root: string;
let repoOnDevelop: string;
let notARepo: string;

function runHook(projectDir: string, command: string, cwd?: string) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, GIT_CEILING_DIRECTORIES: root },
    encoding: 'utf8',
  });
  return { code: result.status, stderr: result.stderr };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'guard-git-'));
  repoOnDevelop = join(root, 'repo');
  notARepo = join(root, 'plain');
  execFileSync('git', ['init', '-q', '-b', 'develop', repoOnDevelop]);
  mkdirSync(notARepo);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('guard-git hook', () => {
  it('blocks a commit on develop with exit code 2 and an explanation', () => {
    const { code, stderr } = runHook(repoOnDevelop, 'git commit -m x');
    expect(code).toBe(2);
    expect(stderr).toMatch(/^Blocked by \.claude\/hooks\/guard-git\.mjs: do not commit on develop/);
  });

  it('allows a commit after switching to a new work branch in the same command', () => {
    expect(runHook(repoOnDevelop, 'git switch -c feat/y && git commit -m x').code).toBe(0);
  });

  it('allows commands that are not git', () => {
    expect(runHook(repoOnDevelop, 'npm run verify').code).toBe(0);
  });

  it('reads the branch from the hook input cwd, not only the project dir', () => {
    const { code, stderr } = runHook(notARepo, 'git commit -m x', repoOnDevelop);
    expect(code).toBe(2);
    expect(stderr).toMatch(/do not commit on develop/);
  });

  it('treats a cd out of the project as an unknown branch', () => {
    const { code, stderr } = runHook(repoOnDevelop, `cd "${notARepo}" && git commit -m x`);
    expect(code).toBe(2);
    expect(stderr).toMatch(/cannot tell which branch/);
  });

  it('fails closed when the current branch cannot be read', () => {
    expect(runHook(notARepo, 'git commit -m x').code).toBe(2);
    expect(runHook(notARepo, 'git push').code).toBe(2);
    expect(runHook(notARepo, 'git status').code).toBe(0);
  });
});

describe('guard-git hook: local review gate', () => {
  let repo: string;
  let worktree: string;
  let first: string;
  let second: string;
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com',
  };
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  const approve = (dir: string, sha: string) => {
    const marker = join(git(dir, 'rev-parse', '--absolute-git-dir'), 'claude-review');
    mkdirSync(marker, { recursive: true });
    writeFileSync(
      join(marker, 'approved'),
      `${sha}
`,
    );
  };
  const unapprove = (dir: string) =>
    rmSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'claude-review'), {
      recursive: true,
      force: true,
    });

  beforeAll(() => {
    repo = join(root, 'reviewed');
    execFileSync('git', ['init', '-q', '-b', 'develop', repo]);
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'base');
    git(repo, 'switch', '-q', '-c', 'feat/x');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'reviewed');
    first = git(repo, 'rev-parse', 'HEAD');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'after the review');
    second = git(repo, 'rev-parse', 'HEAD');
    worktree = join(root, 'worktree');
    git(repo, 'worktree', 'add', '-q', '-b', 'fix/y', worktree, 'develop');
  });

  const publish = ['git push -u origin feat/x', 'gh pr create --base develop --fill'];

  it.each(publish)('blocks `%s` without an approval marker', (command) => {
    unapprove(repo);
    const { code, stderr } = runHook(repo, command);
    expect(code).toBe(2);
    expect(stderr).toMatch(/no local review approval/);
    expect(stderr).toMatch(/local review loop/);
  });

  it.each(publish)('blocks `%s` when the marker holds an older commit', (command) => {
    approve(repo, first);
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/feat/x');
    const { code, stderr } = runHook(repo, command);
    expect(code).toBe(2);
    expect(stderr).toContain(first.slice(0, 12));
  });

  it.each(publish)('blocks `%s` when the marker is not a commit sha', (command) => {
    approve(repo, 'approved');
    expect(runHook(repo, command).code).toBe(2);
  });

  it.each(publish)('allows `%s` when the marker holds HEAD', (command) => {
    approve(repo, second);
    expect(runHook(repo, command)).toEqual({ code: 0, stderr: '' });
  });

  it.each(publish)(
    'allows `%s` for commits on top of the approval when the branch is on origin',
    (command) => {
      approve(repo, first);
      git(repo, 'update-ref', 'refs/remotes/origin/feat/x', first);
      expect(runHook(repo, command).code).toBe(0);
      git(repo, 'update-ref', '-d', 'refs/remotes/origin/feat/x');
    },
  );

  it("reads the marker from the worktree's own git dir", () => {
    unapprove(repo);
    expect(runHook(worktree, 'git push -u origin fix/y').code).toBe(2);
    approve(worktree, git(worktree, 'rev-parse', 'HEAD'));
    expect(runHook(worktree, 'git push -u origin fix/y').code).toBe(0);
    // the main checkout's marker does not count for the worktree, and vice versa
    expect(runHook(repo, 'git push -u origin feat/x').code).toBe(2);
  });

  it.each([
    'git push -u origin rc/v1.2.3',
    'git push origin v1.2.3',
    'gh pr create --base rc/v1.2.3 --head develop --title "Release v1.2.3" --body-file x',
  ])('does not gate the release command `%s`', (command) => {
    unapprove(repo);
    expect(runHook(repoOnDevelop, command).code).toBe(0);
  });
});
