---
name: review
description: Run an independent review of the current change (branch diff against develop plus uncommitted work) with the read-only reviewer agent. Use before every PR and whenever Jan asks for a review.
context: fork
agent: reviewer
argument-hint: "[optional focus, e.g. 'a11y' or a PR number]"
---

Review the current change in this repository. Focus: $ARGUMENTS

Follow your full process: collect the diff against `develop` (committed and uncommitted), read the
changed files and `CLAUDE.md`, run the checks, analyse risks, and return the report in the exact
format from your instructions. Do not modify any files.
