---
name: deploy
description: Release the current branch to production. Verify, open a PR, wait for CI, merge to main (Vercel deploys main), then smoke-test the live site. Only when Jan explicitly asks to deploy.
disable-model-invocation: true
---

# /deploy

Production is whatever is on `main`: Vercel builds and deploys it automatically
(https://portfolio-v2-sigma-two.vercel.app, also reachable via janpodzimek.wz.cz).

1. **Preconditions.** Not on `main`; working tree clean; latest `/review` verdict is not
   "Changes requested". If not, stop and say what is missing.
2. **Verify locally:** `npm run verify`. Stop on any failure.
3. **Push the branch** (`git push -u origin <branch>`) and **open a PR**: with `gh pr create` if
   the GitHub CLI is available, otherwise give Jan the compare URL
   `https://github.com/JanPodzimek/portfolio/compare/<branch>?expand=1`. The PR description lists:
   what changed, how it is tested, new dependencies (with reason), the review verdict.
4. **Wait for CI and the Vercel preview.** Ask Jan to check the preview URL on his phone.
5. **Merge only after Jan says so** (squash merge). Never push to `main` directly.
6. **Smoke test production** once Vercel finishes:
   ```sh
   curl -sI https://portfolio-v2-sigma-two.vercel.app/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cs/ | head -1
   curl -sI https://portfolio-v2-sigma-two.vercel.app/cv/Jan-Podzimek-CV-EN.pdf | head -1
   ```
   All must be `200`. Report the result and the deployed commit.
7. **Rollback** if production is broken: in Vercel → Deployments, promote the previous
   deployment, then `/fix-bug`.
