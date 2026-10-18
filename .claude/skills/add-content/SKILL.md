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
6. **Ship it, fully automated** (no manual merge, nobody to wait for). Only with a `/review`
   verdict without blocker/major findings:
   ```sh
   git push -u origin feat/<slug>       # or fix/<slug>
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
