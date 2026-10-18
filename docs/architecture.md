# Architecture

## Goals

1. Present Jan to HR and tech leads quickly and clearly, in English and Czech.
2. Be a credible work sample: fast, accessible, tested, and easy to change with AI agents.
3. Stay small. No backend, no database, no client-side framework unless a feature needs one.

## Structure

```
src/
  pages/                 thin route files, one per URL (EN) + pages/cs/** (CZ)
  views/                 full pages, take `locale`  (HomePage, ToolsHub, <Tool>Page, BuiltPage)
  components/            sections and UI pieces, take `locale`, read text via t(locale)
  layouts/Base.astro     <head> (SEO, hreflang, OG), theme bootstrap, header, footer
  i18n/en.ts, cs.ts      all user-visible text; cs.ts is typed as `Dict` = typeof en
  i18n/utils.ts          t(), localePath(), switchLocalePath(), localeFromPath()
  content/case-studies/  one Markdown file per study and language (frontmatter only)
  lib/tools/             pure tool logic, no DOM, unit-tested
  data/site.ts           email, links, CV path, repo URL
  data/tools.ts          tool registry: drives hub, homepage teaser and registry test
  styles/global.css      Tailwind + design tokens (light/dark CSS variables)
tests/unit/              Vitest
tests/e2e/               Playwright (+ axe), runs against `astro preview`
```

### Why thin route files + views

Astro's i18n routing gives `/` (EN, unprefixed) and `/cs/`. Instead of a dynamic `[locale]`
route, every page is an explicit 5-line file that renders a view with a fixed locale. URLs are
obvious from the file tree, and a missing Czech page is caught by `tests/unit/content.test.ts`.

### i18n

- One dictionary per language with an identical shape. `cs: Dict` makes a missing key a type
  error (`astro check`); `tests/unit/i18n.test.ts` also checks key and list-length parity and
  that no string is empty.
- Lists (highlights, skills) are arrays in the dictionary, so order and count stay in sync.
- The CV exists only in English; the Czech button says so.

### Theme

CSS variables on `:root` / `.dark` (see `global.css`), mapped to Tailwind colors with
`@theme inline`. An inline script in `<head>` applies the stored or OS preference before first
paint. The toggle stores the choice in `localStorage`; it is guarded with try/catch.

### QA tools

Each tool is split into:

- `src/lib/tools/<name>.ts`: pure functions, all edge cases unit-tested.
- `src/views/<Name>Page.astro`: markup plus a small bundled `<script>` that wires DOM events
  to the pure functions. Stable `data-testid` hooks for Playwright.
- `src/data/tools.ts` entry with source and test paths (shown as "view source" links).

## Decisions log

| Date       | Decision                                                | Reason                                                                              |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 2026-10-18 | Astro static instead of Next.js                         | Content site with small client-side tools; no server features needed.               |
| 2026-10-18 | Vanilla TS for tools, no UI framework                   | Two simple tools; promote one to a Preact/React island only if state grows.         |
| 2026-10-18 | System font stack, no web fonts                         | Zero font requests, no layout shift; the design relies on spacing and mono accents. |
| 2026-10-18 | E2E against production build, Chromium desktop + mobile | Tests what users get; one engine keeps CI fast. Add Firefox/WebKit if needed.       |
| 2026-10-18 | Reviewer agent runs locally (`/review`), not in CI      | Avoids API costs per PR; CI runs the deterministic checks.                          |
| 2026-10-18 | Canonical URL is the Vercel domain                      | janpodzimek.wz.cz redirects there.                                                  |

If a server need appears (secrets, persistence), use Astro endpoints with the Vercel adapter
rather than switching frameworks.
