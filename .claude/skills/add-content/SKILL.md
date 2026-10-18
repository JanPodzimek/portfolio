---
name: add-content
description: Add or edit text on the site, such as a section, experience item, skill, certificate or case study, in both English and Czech. Use for copy changes that do not need new components.
argument-hint: <what to add or change>
---

# /add-content $ARGUMENTS

Where content lives:

- Page copy, skills, experience, certificates: `src/i18n/en.ts` and `src/i18n/cs.ts` (same keys).
- Case studies: `src/content/case-studies/en/<slug>.md` and `.../cs/<slug>.md`; schema in
  `src/content.config.ts`; `order` decides position.
- Links, email, CV path: `src/data/site.ts`. Files (CV, certificates): `public/`.

Rules:

1. **Facts only from Jan or his CV.** If a number, date, tool or result is not in the CV or the
   request, ask. Never put internal Alza details (system names, data, screenshots) on the site.
2. Write English first: short sentences, active voice, concrete outcomes. Then write Czech as
   natural Czech, not a literal translation. Use correct typography (`„…“`, `–`, nbsp where needed).
3. Branch from an up-to-date `develop`:
   `git switch develop && git pull && git switch -c feat/<slug>` for new content, or
   `fix/<slug>` for corrections. Update or add an e2e assertion if the change is structural
   (new section, new case study count).
4. `npm run verify:fast` (i18n parity and case-study parity tests catch missing translations),
   then a build and a quick look at both `/` and `/cs/`.
5. `/review`. Put the final EN and CZ text in the PR body and in the reply, so Jan can correct
   the wording later with a `fix/` PR.
6. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only with a `/review` verdict without blocker/major findings:

   ```sh
   git push -u origin feat/<slug>       # or fix/<slug>
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
     `gh pr checks --watch -i 15`, then view and act again.
   - `UNKNOWN`: GitHub is still computing it; run the view up to twice more and act on the new
     value. Still `UNKNOWN` → try the direct merge above; if GitHub refuses it, stop and
     report.

   Releasing to production is a separate step (`/deploy`, only when Jan asks).
