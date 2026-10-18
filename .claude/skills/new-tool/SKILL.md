---
name: new-tool
description: Scaffold and build a new QA tool under /tools (pure logic module, EN and CZ pages, registry entry, i18n, unit and e2e tests). Use when Jan wants to add a utility like a JSON formatter, GUID generator or test-data generator.
argument-hint: <tool name and what it should do>
---

# /new-tool $ARGUMENTS

Copy the structure of the **Column delimiter**, which is the reference implementation.

| Piece          | Reference                                      | New file                                     |
| -------------- | ---------------------------------------------- | -------------------------------------------- |
| Logic (no DOM) | `src/lib/tools/columnDelimiter.ts`             | `src/lib/tools/<camelName>.ts`               |
| Unit tests     | `tests/unit/columnDelimiter.test.ts`           | `tests/unit/<camelName>.test.ts`             |
| Page view      | `src/views/ColumnDelimiterPage.astro`          | `src/views/<PascalName>Page.astro`           |
| Routes         | `src/pages/tools/column-delimiter.astro` (+cs) | `src/pages/tools/<slug>.astro` + `cs/…`      |
| Registry       | `src/data/tools.ts`                            | add `{ slug, key, source, tests }`           |
| Text           | `tools.columnDelimiter` in `src/i18n/*.ts`     | `tools.<camelName>` in **both** languages    |
| E2E tests      | `tests/e2e/column-delimiter.spec.ts`           | `tests/e2e/<slug>.spec.ts`                   |
| A11y           | `tests/e2e/a11y.spec.ts`                       | add `/tools/<slug>/` and `/cs/tools/<slug>/` |

Steps:

1. Agree the behaviour with Jan as a short spec: inputs, options, outputs, edge cases. Edge
   cases become unit tests.
2. Delegate to the `implementer` agent on `feat/tool-<slug>`, created from an up-to-date
   `develop` (`git switch develop && git pull && git switch -c feat/tool-<slug>`), with the spec
   and the table above.
3. Requirements: runs fully in the browser (nothing sent anywhere), works from the keyboard,
   output has a copy button if it is text, `data-testid` prefix unique to the tool.
4. `tests/unit/content.test.ts` checks the registry, routes and test files exist, so it fails
   until every piece is in place.
5. `npm run verify`, then `/review`.
6. **Ship it, fully automated** (no manual merge, nobody to wait for). Only with a `/review`
   verdict without blocker/major findings:
   ```sh
   git push -u origin feat/tool-<slug>
   gh pr create --base develop --fill   # squash commit = PR title + body: make both clear
   gh pr comment --body-file <review>   # the /review report, saved to a scratch file
   gh pr merge --squash --auto --delete-branch
   gh pr checks --watch
   gh pr view --json state -q .state    # repeat until MERGED
   git switch develop && git pull
   ```
   A red check is an automatic stop: fix it on the same branch (the PR updates), then watch
   again. Releasing to production is a separate step (`/deploy`, only when Jan asks).

Backlog ideas: JSON formatter/validator, GUID generator, Base64 encode/decode, Czech test data
generator (IČO / rodné číslo with valid checksums).
