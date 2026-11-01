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
   Delegate the writing and the checks (steps 2–4) to the `implementer` agent.
5. **Local review loop.** Nothing leaves the machine before it ends. One `reviewer` follows the
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
   - **Upheld dispute.** If a report marks a finding upheld after a second dispute on it,
     stop: do not push, and ask Jan, with that report.
   - **Final gate, only when risky.** After the persistent reviewer reports `**Loop:** done`,
     start a **new** `reviewer` for one pass with the full-diff template (previous findings:
     none) if any of these hold: the loop took 3 or more rounds; the reviewer accepted a
     dispute; `git diff --name-only develop...HEAD` lists a path under `.claude/hooks/`,
     `.github/workflows/`, `scripts/`, `.claude/agents/` or `.claude/skills/`, or
     `.claude/settings.json` or `CLAUDE.md`. Its blocker, major and minor findings go back
     into the same loop: the implementer fixes them and the persistent reviewer checks them in
     a delta round, with no second gate. Its nits go in the PR body. No trigger: the
     persistent reviewer's approval is final.
   - **Cap: 5 rounds.** The cap counts every round, including the final gate. If round 5 still
     has blocking findings or an unresolved dispute on a blocking item, stop: do not push, and
     ask Jan, with the last report and the open items. Likewise, if the gate would be round
     6, or its fixes need a round past 5, stop and ask Jan.
   - **Approve.** Only after the final gate passed or was skipped. Save the final report (the
     last one that says `**Loop:** done`, plus the gate's report if it ran) to the scratchpad
     (e.g. `review-final.md`; it becomes the PR comment). Check that `git status --short` is
     empty and that `git rev-parse HEAD` equals the report's `**Head:**`. Then, with the
     Write tool (not a shell command), write that sha on one line to
     `<git-dir>/claude-review/approved`, where `<git-dir>` is the output of
     `git rev-parse --absolute-git-dir`. The guard-git hook refuses to push a feat/fix branch or
     open its PR until that file holds the current HEAD.

6. Put the final EN and CZ text in the PR body and in the reply, so Jan can correct the wording
   later with a `fix/` PR.
7. **Ship it, fully automated** (nobody to wait for; the only direct merge is the `CLEAN`
   case below). Only after the local review loop ended with `**Loop:** done` and wrote the
   approval:

   ```sh
   git push -u origin feat/<slug>       # or fix/<slug>
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
