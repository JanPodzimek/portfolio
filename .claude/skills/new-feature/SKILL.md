---
name: new-feature
description: Implement a new feature or change on the portfolio site end to end (plan, branch, implement with tests in EN and CZ, verify, hand off to review). Use when Jan asks to add or change something on the site that is not a QA tool, a bug fix or a pure text change.
argument-hint: <what to build>
---

# /new-feature $ARGUMENTS

1. **Plan in 3–6 bullets**: what changes, which files (follow `CLAUDE.md` › Architecture), which
   tests prove it works. If a decision is Jan's to make (wording, visual direction, scope), ask
   before building.
2. **Delegate implementation to the `implementer` agent** with the plan and the acceptance
   criteria. It works on a `feat/<slug>` branch created from an up-to-date `develop`
   (`git switch develop && git pull && git switch -c feat/<slug>`).
3. Checklist the implementer must satisfy:
   - [ ] Unit tests for new logic in `tests/unit/`, e2e tests for new behaviour in `tests/e2e/`
   - [ ] All new text in `src/i18n/en.ts` and `src/i18n/cs.ts`
   - [ ] New pages: EN + CZ route files, added to `tests/e2e/a11y.spec.ts`
   - [ ] `npm run verify` passes
4. **Run `/review`.** If the verdict is "Changes requested", send the findings back to the
   implementer and review again. Stop after two rounds and ask Jan.
5. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only with a `/review` verdict without blocker/major findings:

   ```sh
   git push -u origin feat/<slug>
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

6. **Report to Jan**: what changed, how it is tested, the merged PR, and what he may want to
   check by eye (Czech wording, claims about his work); corrections go in a `fix/` PR.
