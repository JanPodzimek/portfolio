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
  ├─ PR into develop → review posted as a comment → squash auto-merge when CI is green
  └─ /deploy (only when Jan asks), end to end without manual steps:
        rc/vX.Y.Z from main ← develop (auto-merge) → main (auto-merge) → tag vX.Y.Z
        → Vercel production → "Production smoke" run proves it serves that commit
          (rollback pointer on failure)
```

Nothing waits for a manual merge. The flow stops by itself on a red check, a review with
blocker/major findings, or a red "Production smoke" run.

**Merging without a wait.** Each merge is queued with `gh pr merge --auto`, then the skill blocks
on `gh pr checks --watch --required` and reads `gh pr view`. GitHub can run the queued
auto-merge a minute or more after the checks pass, and watching finished checks returns at once
(auto mode refuses `sleep`), so a `CLEAN` but not yet `MERGED` PR is merged directly with the
same method (squash into `develop`, merge commit into an rc and `main`). That cannot skip a
check: the rulesets have no bypass actors and require `verify` and `branch-policy`, so GitHub
refuses the merge until they are green. `BLOCKED` first re-checks the required checks (a
missing or pending one is watched again), `UNSTABLE` looks at all checks (a failed one is red CI
and stops the flow, a pending one is watched), `UNKNOWN` is viewed again, `DIRTY` stops.
`tests/unit/skills.test.ts` guards this rule.

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
- Enforced by `.claude/hooks/guard-git.mjs` locally and the `branch-policy` check on PRs, both
  using the rules in `.claude/hooks/git-policy.mjs` (tested in `tests/unit/gitPolicy.test.ts`
  and `tests/unit/guardGitHook.test.ts`). The hook follows `cd`, `git -C`, branch switches in
  `&&` chains, `$(…)` and `sh -c`, and blocks git run any other way. It is a guard rail for
  agents; the real enforcement is the GitHub rulesets and required checks (see below).
- CI is two workflows. `ci.yml` runs `verify` on pull requests and on pushes to `main` and
  `develop`. `branch-policy.yml` runs `branch-policy` on pull requests only (opened, synchronize,
  reopened, edited), so push runs never report a `branch-policy` check. That matters: a job
  skipped by `if:` still reports a check run, GitHub counts a skipped required check as passed,
  and a release PR (develop → rc) from an already pushed commit would otherwise be mergeable
  before its policy was evaluated. `tests/unit/workflows.test.ts` guards this.

**Bootstrap (done).** GitHub is set up like this:

- `develop` created from `main` at `8477302` and set as the default branch; tag `v1.0.0` on
  `8477302`.
- Rulesets, no bypass actors, 0 required approvals, required checks `verify` + `branch-policy`:
  `main-policy` (`refs/heads/main`, merge commit only, strict: branch must be up to date),
  `develop-policy` (squash only, not strict), `rc-policy` (`refs/heads/rc/v*`, merge commit
  only; creating an rc branch does not require the checks, so `/deploy` can push it).
- `tag-policy` protects release tags `refs/tags/v*`: they cannot be deleted or moved.
- Auto-merge enabled; head branches deleted after merge (rc branches too; `main` and `develop`
  are protected). Squash commit message = PR title + body. Rebase merge disabled.

**Credentials.** Daily automation should run with a fine-grained personal access token limited
to this repository: Contents, Pull requests and Workflows read/write; Actions, Commit statuses
and **Deployments: read**; **no Administration**. GitHub then guarantees the agent cannot change
settings or rulesets or delete the repository, whatever command it runs. The "Production smoke"
workflow needs nothing from this token: it runs in Actions with `permissions: {}` and only
fetches the public site.

**Permission rules are a safety net, not a security boundary.** `.claude/settings.json` allows
exactly the commands the skills run, so the automated flow never stops at a prompt: pushes of
`feat/*`, `fix/*`, `rc/v*` and `v*` tags, `gh pr` and `gh run`, and
`node scripts/deployment-state.mjs <sha>`. No `curl` is allowed: the "Production smoke"
workflow checks production, and a manual `curl` asks for permission first. It denies
destructive `gh` commands (repo delete/edit/rename/archive, `gh auth refresh`, secrets, release
deletion) and **every `gh api` command**. Glob rules cannot safely constrain how gh parses its
flags (grouped short flags such as `-iXPOST` or `-if ref=main` hide the method and the fields).
The one API read the release gate needs, a commit's Production deployment state, lives in
`scripts/deployment-state.mjs` instead: it accepts only a 40-character hex sha, runs gh without
a shell and sends only GETs. `tests/unit/settings.test.ts` extracts every command from the
skills and agents, checks it against these rules and fails if any of them is a raw `gh api`
call. Its matcher only approximates Claude Code's rule matching. Pattern matching on command
text can be bypassed; the token scope and the rulesets are what actually protect the repository.

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
| `/deploy`      | Releasing, end to end                     | Only when Jan asks (`disable-model-invocation`) |

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
