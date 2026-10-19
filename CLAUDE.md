# CLAUDE.md

Personal site of **Jan Podzimek, QA Engineer**: a bilingual (EN/CZ) portfolio plus small QA tools.
Readers are HR people and tech leads. The repository itself is a work sample of agentic coding,
so **how** a change is made matters as much as the change.

## Stack and why

| Choice                           | Why                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| Astro (static output)            | Content site: ships HTML with almost no JS, fast, good SEO. Islands only where needed. |
| Tailwind CSS 4                   | Design tokens in `src/styles/global.css`, no separate CSS architecture to maintain.    |
| TypeScript strict                | i18n dictionaries are typed, so a missing translation is a compile error.              |
| Vitest                           | Fast unit tests for pure logic (tools, i18n helpers).                                  |
| Playwright + axe-core            | UI and accessibility tests against the production build, desktop + mobile.             |
| Vercel (static) + GitHub Actions | Preview per PR, CI runs `verify` on every PR.                                          |

## Commands

```sh
npm run dev          # dev server; prefer `npx astro dev --background` in agent sessions
npm run verify:fast  # lint + astro check + unit tests (seconds)
npm run verify       # everything CI runs: + format check, build, Playwright (≈1–2 min)
npm run test:e2e     # Playwright only; needs `npm run build` first (tests run on `astro preview`)
npm run format       # Prettier (the PostToolUse hook already formats edited files)
```

On Windows Git Bash, prefix commands that pass URL paths with `MSYS_NO_PATHCONV=1`.

## Architecture (details: `docs/architecture.md`)

- `src/pages/**` are **thin route files**: `<View locale="en" />` and `src/pages/cs/**` mirror them.
  Real page markup lives in `src/views/*.astro`; sections in `src/components/*.astro`.
- `src/i18n/en.ts` defines the dictionary and its type `Dict`; `cs.ts` must satisfy `Dict`.
  Use `t(locale)`, `localePath()`, `switchLocalePath()` from `src/i18n/utils.ts`. Never hard-code
  user-visible text in components.
- Case studies: `src/content/case-studies/{en,cs}/<slug>.md` (frontmatter only, schema in
  `src/content.config.ts`).
- QA tools: pure logic in `src/lib/tools/*.ts` (no DOM), UI in `src/views/<Tool>Page.astro` with a
  small vanilla `<script>` and `data-testid` hooks, registered in `src/data/tools.ts`.
- Site facts (email, links, CV path): `src/data/site.ts`.

## Hard rules

1. **Every change ships with a test.** Logic → Vitest in `tests/unit/`. UI/behaviour →
   Playwright in `tests/e2e/`. A bug fix **starts with a failing test** that reproduces it.
2. **Every user-visible string exists in English and Czech.** Add keys to `en.ts` and `cs.ts` in
   the same change; new case studies need both language files. Czech must be natural Czech, not a
   word-for-word translation.
3. **No client-side framework by default.** Tools use vanilla TS. A tool may become a
   Preact/React island only when its UI state outgrows a simple script; record the reason in
   `docs/architecture.md`. Any new dependency needs a one-line reason in the PR description.
4. **Accessibility is a test, not a wish.** `tests/e2e/a11y.spec.ts` (axe, WCAG 2.2 AA, light and
   dark) must pass; add every new page to its list. Images need meaningful `alt`; controls must
   work from the keyboard; visible label text must be part of the accessible name.
5. **Git flow; never commit to `main`, `develop` or `rc/*`.**
   ```
   feat/<slug> ─┐ squash
   fix/<slug>  ─┴──▶ develop ──merge commit──▶ rc/vX.Y.Z ──merge commit──▶ main ──▶ Vercel
   ```
   Work branches are `feat/<slug>` (new things, incl. new text and `feat/tool-<slug>`) or
   `fix/<slug>` (bugs, corrections), created from an up-to-date `develop`. `develop` is the
   integration branch: every work PR targets it. A release (`/deploy`, only when Jan asks) is
   `rc/vX.Y.Z` created from the current `main`; `develop` → rc and rc → `main` are merge
   commits, then `main` is tagged `vX.Y.Z` (any feat → minor, fixes only → patch). **Review
   happens locally, before the PR:** a loop with one `reviewer` agent per change (at most 5
   rounds, plus a fresh final gate for risky changes) until a round has no blocker, major or
   minor findings. Only then is the branch pushed;
   **merges are automated:** a PR into `develop` squash-merges by GitHub auto-merge once CI is
   green, with no further review and no human merge step. Red CI or a loop that does not end
   clean stops the flow. The `guard-git` hook (no push or PR of a work branch before the loop
   approved HEAD), the CI `branch-policy` check and GitHub rulesets enforce this; no force
   pushes.
6. **Definition of done:** `npm run verify` passes, the last round of the local review loop
   has no blocker, major or minor findings and no unresolved dispute on a blocker, major or
   minor item (nits go in the PR body), and the final gate passed when the change is risky.
7. **Facts about Jan come from his CV or from Jan.** Never invent numbers, employers, tools or
   results. Internal Alza details (system names, screenshots, data) never go on the site.

## Workflow

- New feature: `/new-feature` · bug: `/fix-bug` · new QA tool: `/new-tool` · text/case study:
  `/add-content` · review on request: `/review` · release (rc → `main` → tag → production, end
  to end): `/deploy`.
- Implementation is done by the `implementer` agent; review by the separate, read-only
  `reviewer` agent. The author of a change never reviews it. The work skills run the local
  review loop themselves: one reviewer per change, resumed each round with the delta,
  findings back to the same implementer (fix with a commit or dispute with a reason), a fresh
  final gate when the loop was long, a dispute was accepted or hooks, workflows, settings or
  scripts changed; then push, PR and auto-merge.

## Conventions

- Components: PascalCase `.astro`, props typed with `interface Props`, take `locale` and call
  `t(locale)` themselves.
- Test IDs: `data-testid="<tool-prefix>-<thing>"` (e.g. `cd-output`, `cc-words`).
- Prefer role/label locators in Playwright (`getByRole`, `getByLabel`); use test IDs for outputs.
- Commits: imperative mood, one logical change per commit (`Add char counter tool`).
