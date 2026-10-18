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
3. Branch from an up-to-date `develop`: `git switch develop && git pull`, then, as a separate
   command, `git switch -c feat/<slug>` for new content or `git switch -c fix/<slug>` for
   corrections. Update or add an e2e assertion if the change is structural (new section, new
   case study count).
4. `npm run verify:fast` (i18n parity and case-study parity tests catch missing translations),
   then a build and a quick look at both `/` and `/cs/`.
5. Show Jan the final EN and CZ text in the reply so he can approve the wording, then `/review`.
6. **PR into `develop`.** Push the branch, open the PR against `develop`
   (`gh pr create --base develop`) and squash-merge it (`gh pr merge --squash`) only after Jan
   says so.
