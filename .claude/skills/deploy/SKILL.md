---
name: deploy
description: Release develop to production end to end, fully automated. Pick the semver version from tags, create rc/vX.Y.Z from current main, auto-merge develop into it and the rc into main with merge commits, tag main, wait for the Vercel production deployment and smoke-test it. Only when Jan explicitly asks to release or deploy.
disable-model-invocation: true
---

# /deploy (release)

Production is whatever is on `main`: Vercel builds and deploys it automatically
(https://portfolio-v2-sigma-two.vercel.app, also reachable via janpodzimek.wz.cz).

```
develop ──merge commit──▶ rc/vX.Y.Z ──merge commit──▶ main ──▶ tag vX.Y.Z ──▶ Vercel production
                            ▲ always created from the current main
```

Jan asking for `/deploy` is the go. After that nothing waits for a person: every merge uses
GitHub auto-merge and happens when the required checks (`verify`, `branch-policy`) are green.
**Automatic stops:** a red check, a failed command or a red "Production smoke" run stops the
release.
Report what failed and where; never work around it (a direct `gh pr merge <pr> --merge` only
exactly as the merge rule in step 4 allows it, for steps 4 and 5; no direct pushes to
`main`/`develop`/`rc/*`, never squash or rebase into `main` or an rc).

**Waiting** uses only blocking commands: `gh pr checks <pr> --watch --required -i 15` and
`gh run watch <id> --exit-status`. Never `sleep` or a sleep loop (auto mode refuses them).
Limits are attempt counts, not clock time. Whenever a `gh run list` that should find a run
returns `[]` (the run is not created yet), run it again; still `[]` after 5 tries → step 9.

1. **Preconditions.** Otherwise stop and say what is missing.
   ```sh
   git fetch origin --tags
   git status --short                         # must be empty
   git log --oneline origin/main..origin/develop   # must not be empty: unreleased work
   gh run list --workflow CI --branch develop --event push --limit 1 --json databaseId,status,conclusion,headSha
   git rev-parse origin/develop
   ```
   If the run's `status` is not `completed` yet, wait for it with
   `gh run watch <databaseId> --exit-status` and run the `gh run list` again. Then the run must
   have `conclusion` `success` and its `headSha` must equal `git rev-parse origin/develop`.
   No runs at all (`[]`, also after the retries) means nothing has been merged into `develop`
   yet, so there is nothing to release.
2. **Choose the version.** Previous release: `git describe --tags --abbrev=0 origin/main`
   (`v1.0.0` on `8477302` is the baseline). Find the work PRs in the release:
   ```sh
   git rev-list origin/main..origin/develop
   gh pr list --base develop --state merged --limit 100 --json number,title,headRefName,mergeCommit
   ```
   Match `mergeCommit.oid` against the rev-list. Any `feat/` head branch → bump minor
   (`v1.1.0` → `v1.2.0`); only `fix/` → bump patch (`v1.1.0` → `v1.1.1`). Write the change list
   (`- #<number> <title>`) to a scratch file for the PR bodies.
3. **Create the release branch from the current `main`:**
   ```sh
   git fetch origin && git switch -c rc/vX.Y.Z origin/main && git push -u origin rc/vX.Y.Z
   ```
4. **develop → rc (merge commit):**

   ```sh
   gh pr create --base rc/vX.Y.Z --head develop --title "Release vX.Y.Z" --body-file <changes>
   gh pr merge <pr> --merge --auto
   gh pr checks <pr> --watch --required -i 15
   gh pr view <pr> --json state,mergeStateStatus,mergeCommit
   ```

   For every `gh pr checks` in this skill: if it says "no checks reported", the checks have not
   started yet; run it again (up to 5 times) before treating that as a failure.

   **Merge rule (steps 4 and 5).** Act on the `gh pr view`:
   - `MERGED`: done (step 5: note `mergeCommit.oid`).
   - `CLEAN` in `mergeStateStatus` but not `MERGED`: the checks are green and GitHub has not run
     the queued auto-merge yet (it can take a minute or more, and watching the finished checks
     again returns at once). Merge it directly with the same method,
     `gh pr merge <pr> --merge`, then run the view again. "Already merged" from gh is fine. This
     is safe: the rulesets have no bypass actors and require `verify` and `branch-policy`, so
     GitHub refuses the merge while they are not green.
   - `BLOCKED` or `DIRTY`: the PR cannot merge: stop and report the PR URL and its state
     (step 9).
   - `BEHIND` (step 5 only): `main` moved, see "If `main` moved" in step 5.
   - `UNKNOWN` or `UNSTABLE`: GitHub is still computing it; run the view up to twice more and act
     on the new value. Still one of these → try the direct merge above; if GitHub refuses it,
     stop and report (step 9).

   **If `gh pr merge <pr> --merge --auto` is refused with "clean status"**, the PR is already
   mergeable, so there is nothing to queue. That only happens when a successful `branch-policy`
   run already exists on the same head commit (and `verify` too), e.g. for a re-created
   develop → rc PR, or when the PR's own run finished before `--auto` was sent. Go straight to
   the `gh pr checks` and `gh pr view` above and apply the merge rule.

5. **rc → main (merge commit):**
   ```sh
   gh pr create --base main --head rc/vX.Y.Z --title "Release vX.Y.Z" --body-file <changes>
   gh pr merge <pr> --merge --auto
   gh pr checks <pr> --watch --required -i 15
   gh pr view <pr> --json state,mergeStateStatus,mergeCommit   # MERGED: note mergeCommit.oid
   ```
   Apply the merge rule from step 4. **If `main` moved** (`mergeStateStatus` is `BEHIND`, or
   `branch-policy` fails because the rc does not contain the current `main`): `main` is strict,
   so auto-merge would wait forever. Do not update the rc. Close the release PR and delete the
   rc, then start again at step 1 (the version may change). `--delete-branch` removes the remote and the local rc, so no
   `git branch -D` follows:
   ```sh
   git switch develop && gh pr close <pr> --delete-branch
   ```
6. **Tag the release** on the merge commit (`git rev-parse origin/main` must equal the
   `mergeCommit.oid` from step 5):
   ```sh
   git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z
   ```
7. **Release gate: the "Production smoke" run** for the merge commit `<oid>`. Vercel deploys
   `main` through its own GitHub integration (not in CI). When the Production deployment
   succeeds, `.github/workflows/production-smoke.yml` first checks that `/` serves
   `<meta name="build-sha" content="<oid>">`, i.e. this exact commit and not the previous
   production, then that `/`, `/cs/` and the CV PDF answer 200. Its success is the release gate:
   ```sh
   gh run list --workflow "Production smoke" --commit <oid> --limit 10 --json databaseId,status,conclusion
   gh run watch <databaseId> --exit-status   # red → step 9
   gh run list --workflow "Production smoke" --commit <oid> --limit 10 --json databaseId,status,conclusion
   ```
   Every deployment status triggers a run, and a run whose job did not match a successful
   Production deployment ends `skipped`. So pick the newest run whose `conclusion` is not
   `skipped` (a running one has an empty `conclusion`), watch that one, and list again: its
   `conclusion` must be `success`, because a skipped or successful run both make the watch
   exit 0. Anything else → step 9. Only `skipped` runs, or `[]`, mean Vercel is still building
   and the gating run does not exist yet. Then wait on the CI run for the push to `main`, run
   the list again, and repeat up to 10 times:
   ```sh
   gh run list --workflow CI --branch main --event push --commit <oid> --limit 1 --json databaseId
   gh run watch <databaseId> --exit-status
   ```
   Watching that CI run only serves as a natural delay of a minute or two while it runs; once it
   has finished, watching it again returns at once, so later attempts are only as far apart as
   the commands take. Still `[]` after 10 attempts → read the deployment state for the report
   and go to step 9:
   ```sh
   gh api repos/JanPodzimek/portfolio/deployments -X GET -f environment=Production -f sha=<oid> -q '.[0].id'
   gh api repos/JanPodzimek/portfolio/deployments/<id>/statuses -q '.[0].state'
   ```
8. **Report and clean up.** Report the version, the change list, the merge commit and the
   "Production smoke" run URL. There is no separate local `curl` smoke test any more: the
   workflow runs the same checks and, unlike a bare 200, proves that production serves this
   commit. Then `git switch develop && git pull && git branch -D rc/vX.Y.Z` (GitHub already
   deleted the remote rc after the merge).
9. **On failure** report exactly what failed (step, output, PR or deployment URL) and point to
   the rollback: in Vercel → Deployments, promote the previous production deployment, then
   `/fix-bug`. Do not revert `main` by hand.
