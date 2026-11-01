---
name: review
description: Run an independent review of the current change (branch diff against develop plus uncommitted work) with the read-only reviewer agent. Use whenever Jan asks for a review; the work skills run their own local review loop (one reviewer per change, plus a fresh final gate for risky changes) before every PR.
context: fork
agent: reviewer
argument-hint: "[optional focus, e.g. 'a11y' or a PR number]"
---

Review the current change in this repository. Focus or loop input: $ARGUMENTS

Follow your full process: collect the diff against `develop` (committed and uncommitted), read the
changed files and `CLAUDE.md`, run the checks, analyse risks, and return the report in the exact
format from your instructions. Do not modify any files.

The input may be a round of the local review loop: the round number, the previous round's
findings and the implementer's response to each (`fixed in <sha>` or `disputed: <reason>`).
Then review the full diff fresh anyway, judge each previous item (closed, still open, dispute
accepted) and fill in the `**Loop:**` line. This skill runs in a forked context with no
conversation history, so it only knows what the input says.
