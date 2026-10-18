# Agentic workflow

How this repository is developed with Claude Code, and how it maps to GitHub Copilot concepts
for anyone coming from Copilot custom agents.

| GitHub Copilot                      | Claude Code (this repo)                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `.github/copilot-instructions.md`   | `CLAUDE.md`: loaded automatically at the start of every session                                    |
| Custom agents (dropdown in VS Code) | `.claude/agents/*.md`: called with `@implementer` / `@reviewer` or delegated automatically         |
| Prompt files / slash commands       | `.claude/skills/*/SKILL.md`: run as `/new-feature`, `/review`, …                                   |
| (no equivalent)                     | Hooks in `.claude/settings.json`: scripts the harness runs, so they are enforced, not just advised |

## The loop

```
Jan: "/new-feature add a dark/light preview to the hero"
  │
  ├─ main session plans (3–6 bullets), asks if a decision is Jan's
  ├─ implementer agent: feat/<slug> from develop → tests → code → EN+CZ text → verify → commit
  │     └─ hooks: Prettier on every edit · verify:fast before it may stop · branch policy
  ├─ /review → reviewer agent (read-only, fresh context): diff vs CLAUDE.md, runs checks,
  │            risks, findings table with severity, verdict
  ├─ fix findings (back to implementer), max two rounds, then ask Jan
  ├─ PR into develop → CI green → Jan says go → squash merge
  └─ /deploy (only when Jan asks): rc/vX.Y.Z from main ← develop → PR to main → Jan merges
                                    → tag vX.Y.Z → smoke test
```

## Branching

```
feat/<slug> ─┐ squash
fix/<slug>  ─┴──▶ develop ──merge commit──▶ rc/vX.Y.Z ──merge commit──▶ main ──▶ Vercel production
                                              ▲ always created from the current main
```

- `feat/<slug>` for new things (features, new text, `feat/tool-<slug>` for tools), `fix/<slug>`
  for bugs and corrections. Created from an up-to-date `develop`.
- `develop` accepts only squash-merged PRs from `feat/*` and `fix/*`.
- `rc/vX.Y.Z` is created from the current `main` and accepts only `develop` (merge commit).
  Every release goes through an rc.
- `main` accepts only merge commits from `rc/vX.Y.Z`; after the merge, `main` is tagged
  `vX.Y.Z`.
- Versioning is semver, starting at `v1.0.0`: a release with any `feat` bumps minor, fixes only
  bump patch.
- Enforced by `.claude/hooks/guard-git.mjs` locally and the CI `branch-policy` job on PRs, both
  using the rules in `.claude/hooks/git-policy.mjs` (tested in `tests/unit/gitPolicy.test.ts`
  and `tests/unit/guardGitHook.test.ts`). The hook follows `cd`, `git -C`, branch switches in
  `&&` chains, `$(…)` and `sh -c`, and blocks git run any other way. It is a guard rail for
  agents; the real enforcement is the GitHub rulesets and required checks (see bootstrap).

**Bootstrap (one-time, Jan on GitHub):** create `develop` from `main`; tag the current
production commit `8477302` as `v1.0.0`; make `develop` the default branch; add rulesets:
`main` merge commit only and branch must be up to date, `develop` squash only, `rc/v*` merge
commit only, and required status checks `verify` and `branch-policy` on all three.

## Why two agents

The implementer is optimised to finish the task; it is biased towards believing its own work.
The reviewer runs in a separate context, cannot edit files, and is asked to find problems
against a fixed checklist. It's the same separation of duties a QA team has with developers.

## Agents

- **implementer**: all tools. Must follow `CLAUDE.md`, add tests, keep EN/CZ in sync, never
  invent facts, never push or deploy.
- **reviewer**: `Read`, `Grep`, `Glob`, `Bash` only. Fixed report format: verdict, check
  results, findings table (blocker / major / minor / nit), uncovered risks.

## Skills

| Command        | Use for                                   | Notes                                           |
| -------------- | ----------------------------------------- | ----------------------------------------------- |
| `/new-feature` | Any site change that is not covered below | Plans, delegates to implementer, reviews        |
| `/fix-bug`     | Wrong behaviour                           | Failing test first, root cause, regression test |
| `/new-tool`    | A new utility under `/tools`              | Reference implementation table                  |
| `/add-content` | Text, skills, case studies                | Facts only from Jan / CV, both languages        |
| `/review`      | Before every PR                           | Runs in the reviewer agent (forked context)     |
| `/deploy`      | Releasing                                 | Manual only (`disable-model-invocation`)        |

## Hooks

| Event                    | Script                             | Effect                                                                                                                                      |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PreToolUse (Bash)        | `.claude/hooks/guard-git.mjs`      | Enforces branch names; on main, develop, rc/* only fast-forward updates (no commit, merge, rebase, push…); no force pushes, no tag deletion |
| PostToolUse (Edit/Write) | `.claude/hooks/format-file.mjs`    | Formats the edited file with Prettier                                                                                                       |
| Stop                     | `.claude/hooks/verify-on-stop.mjs` | If code changed, runs `verify:fast`; on failure Claude must keep working                                                                    |

## Personal settings

`.claude/settings.local.json` is git-ignored. During the migration from the old site it grants
read access to `C:/repos/Portfolio-v2` (`additionalDirectories`). Remove it once the old repo
is archived.
