// PreToolUse (Bash): enforce the branching policy in ./git-policy.mjs (protected main, develop
// and rc/*, valid branch names, no force pushes). Exit code 2 blocks the command and shows the
// message to Claude.
// Note: the branch is read before the command runs, so `git switch -c x && git commit` issued
// from develop is blocked. Switch branches in a separate command first.
import { execSync } from 'node:child_process';
import { readStdinJson, projectDir } from './lib.mjs';
import { checkGitCommand } from './git-policy.mjs';

const input = await readStdinJson();
const command = String(input?.tool_input?.command ?? '');

function currentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectDir(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return '';
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
