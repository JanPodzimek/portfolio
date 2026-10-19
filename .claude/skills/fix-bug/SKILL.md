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

Steps 1–5 are the `implementer` agent's work: delegate them with the bug report.

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
5. **Commit** as `Fix <what> (<where>)`.
6. **Local review loop.** Nothing leaves the machine before it ends.

   - **A new reviewer every round.** Start each round as a new agent with the Agent tool,
     `subagent_type: reviewer`. Never resume or message an earlier reviewer: each round reads
     the change cold.
   - **A fixed prompt.** Fill in this template and send nothing else. Never pass the
     implementer's summary, rationale or hand-off text.

     ```md
     Review branch <branch> against develop. Round <n> of at most 5.
     Review the full diff fresh, then judge every previous finding: closed, still open or
     dispute accepted. Return the report in your exact format, including the Loop line.

     Previous round's findings and the implementer's responses (round 1: none):

     | #   | Severity | File:line | Finding | Response                            |
     | --- | -------- | --------- | ------- | ----------------------------------- |
     | 1   | <sev>    | <where>   | <what>  | fixed in <sha> / disputed: <reason> |
     ```

   - **Exit** when a round's report says `**Loop:** done`: no blocker, major or minor finding
     and no unresolved dispute on a blocking item (every blocker, major or minor previous item
     closed or its dispute accepted). Nits never block, open or disputed: fix them if cheap (a
     fix after the last round needs one more round, because the approval is for the reviewed
     commit), otherwise list them in the PR body.
   - **Otherwise** send the findings table, nits included, to the **same** `implementer` that
     made the change (SendMessage to it, never a new one). It answers every finding with
     `fixed in <sha>` (a commit) or `disputed: <reason>`. The findings plus those responses are
     the next round's prompt.
   - **Cap: 5 rounds.** If round 5 still has blocking findings or an unresolved dispute on a
     blocking item, stop: do not push, and ask Jan, with the last report and the open items.
   - **Approve.** Save the final report to the scratchpad (e.g. `review-final.md`; it becomes the
     PR comment). Check that `git status --short` is empty and that `git rev-parse HEAD` equals
     the report's `**Head:**`. Then, with the Write tool (not a shell command), write that sha on
     one line to `<git-dir>/claude-review/approved`, where `<git-dir>` is the output of
     `git rev-parse --absolute-git-dir`. The guard-git hook refuses to push a feat/fix branch or
     open its PR until that file holds the current HEAD.

7. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only after the local review loop ended with `**Loop:** done` and wrote the
   approval:

   ```sh
   git push -u origin fix/<slug>
   gh pr create --base develop --fill   # squash commit = PR title + body: make both clear
   gh pr comment --body-file <review>   # the final report of the local review loop
   gh pr merge --squash --auto --delete-branch
   gh pr checks --watch --required -i 15
   gh pr view --json state,mergeStateStatus,mergeCommit
   git switch develop && git pull
   ```

   Wait only with the blocking `gh pr checks --watch`, never with `sleep` (auto mode refuses
   sleep loops). Right after `gh pr create` it may say "no checks reported": run it again (up to
   5 times) before treating that as a failure. A red check is an automatic stop: fix it on the
   same branch (the PR updates), then watch again. That fix needs no new review round (the
   hook allows the push: the approved commit is its ancestor and the branch is on origin),
   unless it changes behaviour under `src/`. Then run one round of the loop on it first and
   write the new approval; if that round is not `**Loop:** done`, stop and ask Jan. Then act on
   `gh pr view`:
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

8. **Report**: root cause, fix, the regression test that now guards it, the merged PR.
