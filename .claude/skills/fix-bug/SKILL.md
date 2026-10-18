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
6. **Ship it, fully automated** (no manual merge, nobody to wait for). Only with a `/review`
   verdict without blocker/major findings:
   ```sh
   git push -u origin fix/<slug>
   gh pr create --base develop --fill   # squash commit = PR title + body: make both clear
   gh pr comment --body-file <review>   # the /review report, saved to a scratch file
   gh pr merge --squash --auto --delete-branch
   gh pr checks --watch --required
   gh pr view --json state -q .state    # poll every ~30 s until MERGED
   git switch develop && git pull
   ```
   Right after `gh pr create`, `gh pr checks` may say "no checks reported": run it again every
   ~10 s for up to ~60 s before treating that as a failure. A red check is an automatic stop:
   fix it on the same branch (the PR updates), then watch again. If the PR is not `MERGED`
   20 minutes after the checks passed, stop and report the PR URL and its state. Releasing to production is a separate step (`/deploy`, only when Jan asks).
7. **Report**: root cause, fix, the regression test that now guards it, the merged PR.
