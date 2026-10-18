// CI `branch-policy` job: fail a pull request whose base/head pair breaks the branching flow.
// The decision is the pure planPrCheck() in .claude/hooks/git-policy.mjs (unit-tested); this
// script only feeds it the environment and runs the git ancestry check it asks for.
// Needs `fetch-depth: 0` and PR_HEAD_SHA (github.event.pull_request.head.sha).
import { execFileSync } from 'node:child_process';
import { planPrCheck } from '../.claude/hooks/git-policy.mjs';

const plan = planPrCheck({
  base: process.env.GITHUB_BASE_REF,
  head: process.env.GITHUB_HEAD_REF,
  headSha: process.env.PR_HEAD_SHA,
});

function fail(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

if (plan.status === 'skip') {
  console.log(plan.message);
  process.exit(0);
}
if (plan.status === 'fail') fail(plan.message);

if (plan.status === 'check-ancestry') {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', plan.ancestor, plan.commit], {
      stdio: 'inherit',
    });
  } catch {
    fail(plan.message);
  }
  console.log(`Branch policy OK: ${process.env.GITHUB_HEAD_REF} contains ${plan.ancestor}.`);
} else {
  console.log(plan.message);
}
