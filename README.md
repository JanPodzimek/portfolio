# Jan Podzimek · QA Engineer

[![CI](https://github.com/JanPodzimek/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/JanPodzimek/portfolio/actions/workflows/ci.yml)

Personal site: a bilingual (English / Czech) portfolio plus a few small QA tools, built with
[Astro](https://astro.build) and [Claude Code](https://claude.com/claude-code).

**Live:** <https://portfolio-v2-sigma-two.vercel.app> (also via janpodzimek.wz.cz)

## What's inside

| Path                       | What                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `/` · `/cs/`               | About, experience, case studies, how I test, skills, contact |
| `/tools/column-delimiter/` | Join one-record-per-line data into a delimited/quoted list   |
| `/tools/char-counter/`     | Characters, words, lines and UTF-8 bytes, emoji-safe         |
| `/how-it-was-built/`       | The agentic workflow behind this repository                  |

## Run it

Requires Node.js 22.22+ (CI uses 24).

```sh
npm ci
npm run dev            # http://localhost:4321
```

## Test it

```sh
npm run verify:fast               # lint + type check + unit tests
npx playwright install chromium   # once
npm run verify                    # everything CI runs, incl. Playwright UI + accessibility tests
```

| Layer         | Tool                  | Where                    | Covers                                           |
| ------------- | --------------------- | ------------------------ | ------------------------------------------------ |
| Unit          | Vitest                | `tests/unit/`            | Tool logic, i18n helpers, EN/CZ parity, registry |
| UI / e2e      | Playwright            | `tests/e2e/`             | Tools, navigation, language and theme switching  |
| Accessibility | axe-core + Playwright | `tests/e2e/a11y.spec.ts` | WCAG 2.2 AA on every page, light and dark        |

E2E tests run against the production build (`astro preview`) on desktop and mobile Chromium.

## Deploy

`main` is production. Vercel builds every push to `main` and a preview for every pull request.
Work happens on `feat/<slug>` / `fix/<slug>` branches that are squash-merged into `develop`; a
release goes `develop` → `rc/vX.Y.Z` (from current `main`) → `main` with merge commits and is
tagged `vX.Y.Z`. All merges are GitHub auto-merges after green CI and a clean review (see [`docs/agentic-workflow.md`](docs/agentic-workflow.md#branching) and
`.claude/skills/deploy/`).

## Working on it with Claude Code

This repo is set up for agentic development. Start with [`CLAUDE.md`](CLAUDE.md).

| Piece                   | Location                                  | Purpose                                                                  |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| Project instructions    | `CLAUDE.md`                               | Architecture, stack rationale, hard rules, conventions                   |
| Agents                  | `.claude/agents/`                         | `implementer` (builds, adds tests) and `reviewer` (read-only)            |
| Skills (slash commands) | `.claude/skills/`                         | `/new-feature` `/fix-bug` `/new-tool` `/add-content` `/review` `/deploy` |
| Hooks                   | `.claude/settings.json`, `.claude/hooks/` | Auto-format, enforce the branching policy, run checks before finishing   |

More: [`docs/architecture.md`](docs/architecture.md) ·
[`docs/agentic-workflow.md`](docs/agentic-workflow.md)

## License

Code: MIT. Text, photos and CV: © Jan Podzimek, all rights reserved.
