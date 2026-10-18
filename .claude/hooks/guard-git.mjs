// PreToolUse (Bash): enforce the branching policy in ./git-policy.mjs (protected main, develop
// and rc/*, valid branch names, no force pushes, no tag deletion). Exit code 2 blocks the
// command and shows the message to Claude. Covered by tests/unit/guardGitHook.test.ts.
import { execFileSync } from 'node:child_process';
import { readStdinJson, projectDir } from './lib.mjs';
import { checkGitCommand } from './git-policy.mjs';

const input = await readStdinJson();
const command = String(input?.tool_input?.command ?? '');

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, { cwd: projectDir(), stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
}

/** Current branch name, 'HEAD' when detached, '' when unknown (the policy then fails closed). */
function currentBranch() {
  try {
    return git(['symbolic-ref', '--short', '-q', 'HEAD']); // also works on an unborn branch
  } catch {
    try {
      git(['rev-parse', '--verify', '-q', 'HEAD']);
      return 'HEAD';
    } catch {
      return '';
    }
  }
}

if (/\bgit\b/.test(command)) {
  const error = checkGitCommand(command, currentBranch());
  if (error) {
    process.stderr.write(`Blocked by .claude/hooks/guard-git.mjs: ${error}\n`);
    process.exit(2);
  }
}

process.exit(0);
