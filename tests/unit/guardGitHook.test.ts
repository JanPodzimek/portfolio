// End-to-end check of the PreToolUse hook script: real node process, JSON on stdin, real git
// repository for the current branch. The policy itself is covered in gitPolicy.test.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
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
