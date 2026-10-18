// PreToolUse (Bash): enforce "never commit or push to main, never force push".
// Exit code 2 blocks the command and shows the message to Claude.
import { execSync } from 'node:child_process';
import { readStdinJson, projectDir } from './lib.mjs';

const input = await readStdinJson();
const command = String(input?.tool_input?.command ?? '');

function block(message) {
  process.stderr.write(`Blocked by .claude/hooks/guard-git.mjs: ${message}\n`);
  process.exit(2);
}

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

const protectedBranch = /^(main|master)$/;
// `main` as a whole push refspec: `git push origin main`, `HEAD:main`, `feat/x:refs/heads/main`.
const pushTargetsMain = /(\s|:|refs\/heads\/)(main|master)(\s|$)/;
// Allow git's global options before the subcommand: `git -C dir push`, `git -c k=v commit`.
const gitCmd = (sub) => new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+)*\\s+${sub}\\b`);

// Note: the branch is checked before the command runs, so `git switch -c x && git commit`
// issued from main is blocked. Switch branches in a separate command first.
if (gitCmd('push').test(command)) {
  if (/(\s--force\b|\s--force-with-lease\b|\s-f\b|\s\+\S)/.test(command)) {
    block('force pushes are not allowed.');
  }
  if (pushTargetsMain.test(command)) {
    block('do not push to main. Push your feature branch and open a pull request.');
  }
  if (protectedBranch.test(currentBranch())) {
    block('you are on main. Create a branch (feat/…, fix/…, content/…) first.');
  }
}

if (gitCmd('commit').test(command) && protectedBranch.test(currentBranch())) {
  block('do not commit on main. Create a branch (feat/…, fix/…, content/…) first.');
}

process.exit(0);
