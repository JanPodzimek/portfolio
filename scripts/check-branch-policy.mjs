// CI `branch-policy` job: fail a pull request whose base/head pair breaks the branching flow
// (see .claude/hooks/git-policy.mjs). A release PR rc/vX.Y.Z → main must also contain the
// current main, i.e. the rc was created from it. Needs `fetch-depth: 0` for the ancestry check.
// PR_HEAD_SHA is the PR head commit: on pull_request events HEAD is the synthetic merge commit,
// which always contains main, so checking HEAD would prove nothing.
import { execSync } from 'node:child_process';
import { checkPrBranches, RC_BRANCH } from '../.claude/hooks/git-policy.mjs';

const base = process.env.GITHUB_BASE_REF ?? '';
const head = process.env.GITHUB_HEAD_REF ?? '';
const headSha = /^[0-9a-f]{40}$/.test(process.env.PR_HEAD_SHA ?? '')
  ? process.env.PR_HEAD_SHA
  : 'HEAD';

function fail(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

if (!base || !head) {
  console.log('Not a pull request (GITHUB_BASE_REF/GITHUB_HEAD_REF unset); nothing to check.');
  process.exit(0);
}

const error = checkPrBranches(base, head);
if (error) fail(`Branch policy: ${head} → ${base} is not allowed. ${error}`);

if (base === 'main' && RC_BRANCH.test(head)) {
  try {
    execSync(`git merge-base --is-ancestor origin/main ${headSha}`, { stdio: 'inherit' });
  } catch {
    fail(
      `Branch policy: ${head} does not contain the current origin/main. ` +
        'Release branches must be created from the current main: ' +
        `git fetch origin && git switch -c ${head} origin/main (recreate the rc if main moved).`,
    );
  }
}

console.log(`Branch policy OK: ${head} → ${base}.`);
