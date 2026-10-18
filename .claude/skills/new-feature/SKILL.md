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
   (`git switch develop && git pull`, then `git switch -c feat/<slug>` as a separate command).
3. Checklist the implementer must satisfy:
   - [ ] Unit tests for new logic in `tests/unit/`, e2e tests for new behaviour in `tests/e2e/`
   - [ ] All new text in `src/i18n/en.ts` and `src/i18n/cs.ts`
   - [ ] New pages: EN + CZ route files, added to `tests/e2e/a11y.spec.ts`
   - [ ] `npm run verify` passes
4. **Run `/review`.** If the verdict is "Changes requested", send the findings back to the
   implementer and review again. Stop after two rounds and ask Jan.
5. **Report to Jan**: what changed, how it is tested, what he should check by eye (Czech
   wording, claims about his work).
6. **PR into `develop`.** Push the branch, open the PR against `develop`
   (`gh pr create --base develop`) and squash-merge it (`gh pr merge --squash`) only after Jan
   says so. Releasing to production is a separate step (`/deploy`).
