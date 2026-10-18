---
name: deploy
description: Release develop to production through a release branch. Pick the semver version, create rc/vX.Y.Z from current main, merge develop into it and the rc into main with merge commits, tag main, then smoke-test the live site. Only when Jan explicitly asks to release or deploy.
disable-model-invocation: true
---

# /deploy (release)

Production is whatever is on `main`: Vercel builds and deploys it automatically
(https://portfolio-v2-sigma-two.vercel.app, also reachable via janpodzimek.wz.cz).

```
develop ──merge commit──▶ rc/vX.Y.Z ──merge commit──▶ main ──▶ tag vX.Y.Z ──▶ Vercel production
                            ▲ always created from the current main
```

**Never squash or rebase into `main` or an `rc/*` branch**, and never push to them directly.

1. **Preconditions.** `git fetch origin`. Working tree clean; `develop` has commits that are not
   in `main` (`git log --oneline origin/main..origin/develop` is not empty); CI is green on the
   latest `develop` commit. If not, stop and say what is missing.
2. **Choose the version.** Latest release: `git describe --tags --abbrev=0 origin/main`. Read
   `git log --oneline origin/main..origin/develop` (squash commits carry the PR title; check the
   PR branches if unsure): any `feat` → bump minor (`v1.1.0` → `v1.2.0`), fixes only → bump
   patch (`v1.1.0` → `v1.1.1`). Tell Jan the version and the list of changes.
3. **Create the release branch from the current `main`:**
   ```sh
   git fetch origin && git switch -c rc/vX.Y.Z origin/main && git push -u origin rc/vX.Y.Z
   ```
4. **Merge `develop` into the rc** with a merge commit:
   `gh pr create --base rc/vX.Y.Z --head develop --title "Release vX.Y.Z"` (body: the change
   list). After CI (`verify` + `branch-policy`) is green: `gh pr merge --merge`.
5. **Release PR rc → `main`:** `gh pr create --base main --head rc/vX.Y.Z --title "Release vX.Y.Z"`
   with the change list. Wait for CI and the Vercel preview; ask Jan to check the preview on his
   phone. **Merge only after Jan says go:** `gh pr merge --merge`. The `branch-policy` check
   fails if the rc does not contain the current `main`; then recreate the rc from `main`.
6. **Tag the release** on the merge commit:
   ```sh
   git fetch origin && git tag vX.Y.Z origin/main && git push origin vX.Y.Z
   ```
7. **Smoke test production** once Vercel finishes:
   ```sh
   curl -sI https://portfolio-v2-sigma-two.vercel.app/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cs/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cv/Jan-Podzimek-CV-EN.pdf | head -1
   ```
   All must be `200`. Report the result, the version and the deployed commit.
8. **Rollback** if production is broken: in Vercel → Deployments, promote the previous
   deployment, then `/fix-bug`.
