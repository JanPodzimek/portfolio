---
name: fix-bug
description: Fix a bug on the portfolio site test-first. Reproduce it with a failing test, fix the cause, prove the fix, then review. Use when something on the site or in a QA tool behaves incorrectly.
argument-hint: <bug description, steps, expected vs actual>
---

# /fix-bug $ARGUMENTS

Write the bug down like a good bug report before touching code:

```md
**Steps:** … **Expected:** … **Actual:** … **Where:** page/locale/viewport/theme
```

1. **Reproduce.** On a `fix/<slug>` branch from an up-to-date `develop`
   (`git switch develop && git pull && git switch -c fix/<slug>`), write the smallest test
   that fails because of the bug: Vitest if the cause is in `src/lib/**` or
   `src/i18n/utils.ts`, Playwright otherwise. Run it and confirm it fails
   **for the reason in the report**. If you cannot reproduce it, stop and tell Jan what you
   tried.
2. **Find the root cause.** Explain it in one or two sentences. Check whether the same mistake
   exists elsewhere (other locale, other tool, other viewport).
3. **Fix the cause**, not the symptom. Do not change the test to match the bug.
4. **Prove it.** The new test passes; `npm run verify` passes.
5. **Commit** as `Fix <what> (<where>)`, then run `/review`.
6. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only with a `/review` verdict without blocker/major findings:

   ```sh
   git push -u origin fix/<slug>
   gh pr create --base develop --fill   # squash commit = PR title + body: make both clear
   gh pr comment --body-file <review>   # the /review report, saved to a scratch file
   gh pr merge --squash --auto --delete-branch
   gh pr checks --watch --required -i 15
   gh pr view --json state,mergeStateStatus,mergeCommit
   git switch develop && git pull
   ```

   Wait only with the blocking `gh pr checks --watch`, never with `sleep` (auto mode refuses
   sleep loops). Right after `gh pr create` it may say "no checks reported": run it again (up to
   5 times) before treating that as a failure. A red check is an automatic stop: fix it on the
   same branch (the PR updates), then watch again. Then act on `gh pr view`:
   - `MERGED`: done.
   - `CLEAN` in `mergeStateStatus` but not `MERGED`: the checks are green and GitHub has not run
     the queued auto-merge yet (it can take a minute or more, and watching the finished checks
     again returns at once). Merge it directly with the same method,
     `gh pr merge --squash --delete-branch`, then run the view again. "Already merged" from gh
     is fine. On any other error, run the view again: `MERGED` is fine, anything else → stop and
     report. This is safe: the rulesets have no bypass actors and require `verify` and
     `branch-policy`, so GitHub refuses the merge while they are not green.
   - `BLOCKED`: run `gh pr checks --required`. If `verify` or `branch-policy` is missing or
     pending (not failed), watch again with `gh pr checks --watch --required -i 15` (up to 5
     times, like "no checks reported"), then view and act again. Stop and report the PR URL and
     its state if a required check failed, or if it is still `BLOCKED` after that.
   - `DIRTY`: a merge conflict: stop and report the PR URL and its state.
   - `UNSTABLE`: mergeable, but a check that is not required failed or is still pending (e.g. the
     Vercel preview). Run `gh pr checks` (all checks, without `--required`). A failed check is
     red CI: stop and report it. If it is only pending, wait with
     `gh pr checks --watch -i 15`, then view and act again (up to 5 times, like `BLOCKED`).
     Stop and report the PR URL and its state if it is still `UNSTABLE` after that.
   - `UNKNOWN`: GitHub is still computing it; run the view up to twice more and act on the new
     value. Still `UNKNOWN` → try the direct merge above; if GitHub refuses it, stop and
     report.

   Releasing to production is a separate step (`/deploy`, only when Jan asks).

7. **Report**: root cause, fix, the regression test that now guards it, the merged PR.
