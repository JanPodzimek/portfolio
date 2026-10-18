// Stop: before Claude finishes a turn that changed code or tests, run the fast checks
// (lint + types + unit tests). On failure, exit 2 so Claude keeps working and sees why.
// Playwright is not run here (too slow per turn); the skills and CI run it.
import { execSync, spawnSync } from 'node:child_process';
import { readStdinJson, projectDir } from './lib.mjs';

const input = await readStdinJson();
// Claude is already continuing because of this hook: don't loop.
if (input?.stop_hook_active) process.exit(0);

const root = projectDir();
let changed = '';
try {
  changed = execSync('git status --porcelain', { cwd: root }).toString();
} catch {
  process.exit(0);
}

const relevant = changed
  .split('\n')
  .map((line) => line.slice(3).trim())
  .filter((path) =>
    /^(src\/|tests\/|astro\.config|package\.json|tsconfig|eslint\.config)/.test(path),
  );

if (relevant.length === 0) process.exit(0);

const run = spawnSync('npm', ['run', 'verify:fast'], {
  cwd: root,
  shell: process.platform === 'win32',
  encoding: 'utf8',
});

if (run.status !== 0) {
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`
    .trim()
    .split('\n')
    .slice(-40)
    .join('\n');
  process.stderr.write(
    `npm run verify:fast failed for uncommitted changes in ${relevant.length} file(s). ` +
      `Fix it before finishing (CLAUDE.md rule 6).\n\n${output}\n`,
  );
  process.exit(2);
}
process.exit(0);
