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
**Automatic stops:** a red check, a failed command or a failed smoke test stops the release.
Report what failed and where; never work around it (no manual merges, no direct pushes to
`main`/`develop`/`rc/*`, never squash or rebase into `main` or an rc).

1. **Preconditions.** `git fetch origin --tags`. Working tree clean. `develop` has unreleased
   commits (`git log --oneline origin/main..origin/develop` is not empty). The latest CI run on
   `develop` succeeded on its current head:
   `gh run list --branch develop --limit 1 --json conclusion,headSha` → `success` and
   `headSha` equals `git rev-parse origin/develop`. Otherwise stop and say what is missing.
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
   gh pr checks <pr> --watch
   gh pr view <pr> --json state -q .state      # repeat until MERGED
   ```
5. **rc → main (merge commit):**
   ```sh
   gh pr create --base main --head rc/vX.Y.Z --title "Release vX.Y.Z" --body-file <changes>
   gh pr merge <pr> --merge --auto
   gh pr checks <pr> --watch
   gh pr view <pr> --json state,mergeCommit    # repeat until MERGED; note mergeCommit.oid
   ```
   `main` is strict (must be up to date). It only moves through releases, so it can only have
   moved if two releases overlap: then `gh pr update-branch <pr>`; if that is rejected, stop and
   report. `branch-policy` also fails if the rc does not contain the current `main`.
6. **Tag the release** on the merge commit (`git rev-parse origin/main` must equal the
   `mergeCommit.oid` from step 5):
   ```sh
   git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z
   ```
7. **Wait for the Vercel production deployment** of that commit (poll every ~15 s, up to
   ~10 min):
   ```sh
   gh api repos/JanPodzimek/portfolio/deployments -X GET -f environment=Production -f sha=<oid> -q '.[0].id'
   gh api repos/JanPodzimek/portfolio/deployments/<id>/statuses -q '.[0].state'   # until success
   ```
   `failure` or `error` → step 9. If no deployment record appears, poll the smoke test instead.
8. **Smoke test production:**
   ```sh
   curl -sI https://portfolio-v2-sigma-two.vercel.app/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cs/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cv/Jan-Podzimek-CV-EN.pdf | head -1
   ```
   All must be `200`. Report the version, the change list, the merge commit and the result.
   Then `git switch develop && git pull`.
9. **On failure** report exactly what failed (step, output, PR or deployment URL) and point to
   the rollback: in Vercel → Deployments, promote the previous production deployment, then
   `/fix-bug`. Do not revert `main` by hand.
