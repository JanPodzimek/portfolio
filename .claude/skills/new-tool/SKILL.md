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
5. `npm run verify`.
6. **Local review loop.** Nothing leaves the machine before it ends. One `reviewer` follows the
   change across rounds; a fresh one only appears as a fallback or as the final gate.

   - **Round 1: a new reviewer.** Start it with the Agent tool, `subagent_type: reviewer`, and
     keep its agent id. Fill in this full-diff template and send nothing else. Never pass the
     implementer's summary, rationale or hand-off text, in any round.

     ```md
     Review branch <branch> against develop. Round <n> of at most 5. Full-diff review.
     Review the whole branch diff, then judge every previous finding: closed, still open or
     dispute accepted. Return the report in your exact format, including the Loop line.

     Previous findings and the implementer's responses (round 1: none):

     | #   | Severity | File:line | Finding | Response                            |
     | --- | -------- | --------- | ------- | ----------------------------------- |
     | 1   | <sev>    | <where>   | <what>  | fixed in <sha> / disputed: <reason> |
     ```

   - **Rounds 2 and later: the same reviewer.** SendMessage to that agent id with this delta
     template and nothing else (Previous Head is the `**Head:**` of its last report):

     ```md
     Round <n> of at most 5 on branch <branch>. Resumed round.
     Previous Head: <sha>. New HEAD: <sha>.
     Review the delta and how it interacts with the rest of the branch, then judge every
     previous finding. Return the report in your exact format, including the Loop line.

     Previous findings and the implementer's responses:

     | #   | Severity | File:line | Finding | Response                            |
     | --- | -------- | --------- | ------- | ----------------------------------- |
     | 1   | <sev>    | <where>   | <what>  | fixed in <sha> / disputed: <reason> |
     ```

   - **Fallback.** If the reviewer cannot be resumed (the session restarted or was compacted,
     or the id is unknown), start a new reviewer with the full-diff template, previous findings
     table included, and keep its id for the rounds after.
   - **Exit** when a round's report says `**Loop:** done`: no blocker, major or minor finding
     and no unresolved dispute on a blocking item (every blocker, major or minor previous item
     closed or its dispute accepted). Nits never block, open or disputed: fix them if cheap (a
     fix after the last round needs one more round, because the approval is for the reviewed
     commit), otherwise list them in the PR body. Then go to the final gate.
   - **Otherwise** send the findings table, nits included, to the **same** `implementer` that
     made the change (SendMessage to it, never a new one). It answers every finding with
     `fixed in <sha>` (a commit) or `disputed: <reason>`. The findings plus those responses are
     the next round's prompt.
   - **Final gate, only when risky.** After the persistent reviewer reports `**Loop:** done`,
     start a **new** `reviewer` for one pass with the full-diff template (previous findings:
     none) if any of these hold: the loop took 3 or more rounds; the reviewer accepted a
     dispute; `git diff --name-only develop...HEAD` lists a path under `.claude/hooks/`,
     `.github/workflows/` or `scripts/`, or `.claude/settings.json`. Its blocker, major and
     minor findings go back into the same loop: the implementer fixes them and the persistent
     reviewer checks them in a delta round, with no second gate. Its nits go in the PR body.
     No trigger: the persistent reviewer's approval is final.
   - **Cap: 5 rounds.** The cap counts every round, including the final gate. If round 5 still
     has blocking findings or an unresolved dispute on a blocking item, stop: do not push, and
     ask Jan, with the last report and the open items.
   - **Approve.** Only after the final gate passed or was skipped. Save the final report (the
     last one that says `**Loop:** done`, plus the gate's report if it ran) to the scratchpad
     (e.g. `review-final.md`; it becomes the PR comment). Check that `git status --short` is
     empty and that `git rev-parse HEAD` equals the report's `**Head:**`. Then, with the
     Write tool (not a shell command), write that sha on one line to
     `<git-dir>/claude-review/approved`, where `<git-dir>` is the output of
     `git rev-parse --absolute-git-dir`. The guard-git hook refuses to push a feat/fix branch or
     open its PR until that file holds the current HEAD.

7. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only after the local review loop ended with `**Loop:** done` and wrote the
   approval:

   ```sh
   git push -u origin feat/tool-<slug>
   gh pr create --base develop --fill   # squash commit = PR title + body: make both clear
   gh pr comment --body-file <review>   # the final report of the local review loop
   gh pr merge --squash --auto --delete-branch
   gh pr checks --watch --required -i 15
   gh pr view --json state,mergeStateStatus,mergeCommit
   git switch develop && git pull
   ```

   Wait only with the blocking `gh pr checks --watch`, never with `sleep` (auto mode refuses
   sleep loops). Right after `gh pr create` it may say "no checks reported": run it again (up to
   5 times) before treating that as a failure. A red check is an automatic stop: fix it on the
   same branch (the PR updates), then watch again. That fix needs no new review round (the
   hook allows the push: the approved commit is its ancestor and the branch is on origin),
   unless it changes behaviour under `src/`. Then run one round of the loop on it first and
   write the new approval; if that round is not `**Loop:** done`, stop and ask Jan. Then act on
   `gh pr view`:
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
     `gh pr checks --watch -i 15`, then view and act again (up to 5 times, like `BLOCKED`).
     Stop and report the PR URL and its state if it is still `UNSTABLE` after that.
   - `UNKNOWN`: GitHub is still computing it; run the view up to twice more and act on the new
     value. Still `UNKNOWN` → try the direct merge above; if GitHub refuses it, stop and
     report.

   Releasing to production is a separate step (`/deploy`, only when Jan asks).

Backlog ideas: JSON formatter/validator, GUID generator, Base64 encode/decode, Czech test data
generator (IČO / rodné číslo with valid checksums).
