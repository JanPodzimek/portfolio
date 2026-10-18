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

1. **Reproduce.** On a `fix/<slug>` branch, write the smallest test that fails because of the
   bug: Vitest if the cause is in `src/lib/**` or `src/i18n/utils.ts`, Playwright otherwise.
   Run it and confirm it fails **for the reason in the report**. If you cannot reproduce it,
   stop and tell Jan what you tried.
2. **Find the root cause.** Explain it in one or two sentences. Check whether the same mistake
   exists elsewhere (other locale, other tool, other viewport).
3. **Fix the cause**, not the symptom. Do not change the test to match the bug.
4. **Prove it.** The new test passes; `npm run verify` passes.
5. **Commit** as `Fix <what> (<where>)`, then run `/review`.
6. **Report**: root cause, fix, the regression test that now guards it.
