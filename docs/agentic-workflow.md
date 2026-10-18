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
  ├─ implementer agent: branch → tests → code → EN+CZ text → verify → commit
  │     └─ hooks: Prettier on every edit · verify:fast before it may stop · no commits on main
  ├─ /review → reviewer agent (read-only, fresh context): diff vs CLAUDE.md, runs checks,
  │            risks, findings table with severity, verdict
  ├─ fix findings (back to implementer), max two rounds, then ask Jan
  └─ /deploy (only when Jan asks): verify → push branch → PR → CI → Jan merges → smoke test
```

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

| Event                    | Script                             | Effect                                                                   |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------ |
| PreToolUse (Bash)        | `.claude/hooks/guard-git.mjs`      | Blocks commits on `main`, pushes to `main`, force pushes                 |
| PostToolUse (Edit/Write) | `.claude/hooks/format-file.mjs`    | Formats the edited file with Prettier                                    |
| Stop                     | `.claude/hooks/verify-on-stop.mjs` | If code changed, runs `verify:fast`; on failure Claude must keep working |

## Personal settings

`.claude/settings.local.json` is git-ignored. During the migration from the old site it grants
read access to `C:/repos/Portfolio-v2` (`additionalDirectories`). Remove it once the old repo
is archived.
