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
5. **Ship it, fully automated** (no manual merge, nobody to wait for). Only with a `/review`
   verdict without blocker/major findings:
   ```sh
   git push -u origin feat/<slug>
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
6. **Report to Jan**: what changed, how it is tested, the merged PR, and what he may want to
   check by eye (Czech wording, claims about his work); corrections go in a `fix/` PR.
