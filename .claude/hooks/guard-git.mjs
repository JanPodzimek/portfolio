// PreToolUse (Bash): enforce the branching policy in ./git-policy.mjs (protected main, develop
// and rc/*, valid branch names, no force pushes, no tag deletion, no push of a work branch and no
// work PR before the local review loop approved HEAD). Exit code 2 blocks the command and shows
// the message to Claude. Covered by tests/unit/guardGitHook.test.ts.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readStdinJson, projectDir } from './lib.mjs';
import { checkGitCommand } from './git-policy.mjs';

const input = await readStdinJson();
const command = String(input?.tool_input?.command ?? '');
// The Bash tool's working directory; the branch is read there.
const cwd = typeof input?.cwd === 'string' && input.cwd ? input.cwd : projectDir();
const SHA = /^([0-9a-f]{40}|[0-9a-f]{64})$/;

/** @param {string[]} args */
function git(args) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
}

/** @param {string[]} args */
function gitSucceeds(args) {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
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

/**
 * Facts for the local review gate. The marker lives in the git dir of this checkout (a
 * worktree has its own), so it is never committed and each worktree is approved on its own.
 * Any failure leaves the facts empty, so the gate fails closed.
 * @param {string} branch
 * @returns {import('./git-policy.mjs').ReviewFacts}
 */
function reviewFacts(branch) {
  /** @type {import('./git-policy.mjs').ReviewFacts} */
  const facts = { head: '', approved: '', approvedIsAncestor: false, onOrigin: false };
  try {
    facts.head = git(['rev-parse', '--verify', '-q', 'HEAD']);
    const marker = join(git(['rev-parse', '--absolute-git-dir']), 'claude-review', 'approved');
    const approved = readFileSync(marker, 'utf8').trim();
    if (!SHA.test(approved)) return facts;
    facts.approved = approved;
    if (approved !== facts.head) {
      facts.approvedIsAncestor = gitSucceeds(['merge-base', '--is-ancestor', approved, 'HEAD']);
      // The remote-tracking ref, not a network call: it exists once the branch was pushed.
      facts.onOrigin = gitSucceeds([
        'rev-parse',
        '--verify',
        '-q',
        `refs/remotes/origin/${branch}`,
      ]);
    }
  } catch {
    // no HEAD, no git dir or no marker: not approved
  }
  return facts;
}

if (/\b(git|gh)\b/.test(command)) {
  const branch = currentBranch();
  const publishes = /\bpush\b|\bpr\b/.test(command);
  const review = publishes ? reviewFacts(branch) : undefined;
  const error = checkGitCommand(command, branch, { projectDir: projectDir(), cwd, review });
  if (error) {
    process.stderr.write(`Blocked by .claude/hooks/guard-git.mjs: ${error}\n`);
    process.exit(2);
  }
}

process.exit(0);
