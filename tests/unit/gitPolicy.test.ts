import { describe, expect, it } from 'vitest';
import {
  checkGitCommand,
  checkPrBranches,
  FEATURE_BRANCH,
  planPrCheck,
  RC_BRANCH,
} from '../../.claude/hooks/git-policy.mjs';

describe('branch name patterns', () => {
  it.each(['feat/x', 'fix/typo', 'feat/tool-json-formatter', 'fix/a1-b2'])(
    'accepts work branch %s',
    (name) => expect(FEATURE_BRANCH.test(name)).toBe(true),
  );
  it.each(['content/x', 'feat/', 'feat/Upper', 'feat/a--b', 'feat/a_b', 'feature/x', 'fix/-x'])(
    'rejects %s',
    (name) => expect(FEATURE_BRANCH.test(name)).toBe(false),
  );
  it.each([
    ['rc/v1.1.0', true],
    ['rc/v10.0.12', true],
    ['rc/1.1', false],
    ['rc/v1.1', false],
    ['rc/v1.1.0-beta', false],
  ])('rc pattern %s → %s', (name, ok) => expect(RC_BRANCH.test(name)).toBe(ok));
});

describe('checkPrBranches', () => {
  it.each([
    ['develop', 'feat/x'],
    ['develop', 'fix/x'],
    ['develop', 'feat/tool-json-formatter'],
    ['rc/v1.1.0', 'develop'],
    ['main', 'rc/v1.1.0'],
  ])('allows %s ← %s', (base, head) => {
    expect(checkPrBranches(base, head)).toBeNull();
  });

  it.each([
    ['main', 'feat/x', /develop/],
    ['main', 'develop', /rc\/vX\.Y\.Z/],
    ['main', 'rc/1.1', /rc\/vX\.Y\.Z/],
    ['develop', 'content/x', /feat\/<slug> or fix\/<slug>/],
    ['develop', 'main', /feat\/<slug> or fix\/<slug>/],
    ['develop', 'rc/v1.1.0', /feat\/<slug> or fix\/<slug>/],
    ['rc/v1.1.0', 'feat/x', /only accepts a merge-commit PR from develop/],
    ['rc/v1.1.0', 'main', /only accepts a merge-commit PR from develop/],
    ['feat/x', 'fix/y', /may only target/],
  ])('rejects %s ← %s', (base, head, message) => {
    expect(checkPrBranches(base, head)).toMatch(message);
  });
});

describe('checkGitCommand', () => {
  // The hook passes the project dir and the Bash tool's cwd; Git Bash style on purpose.
  const project = { projectDir: 'C:\\repos\\portfolio', cwd: '/c/repos/portfolio' };
  const check = (command: string, branch: string) => checkGitCommand(command, branch, project);

  it.each([
    ['git commit -m "Add x"', 'feat/x'],
    ['git commit -m "Fix y"', 'fix/typo'],
    ['git commit -m "mentions git push origin main in text"', 'feat/x'],
    ['git push -u origin feat/x', 'develop'],
    ['git push', 'feat/x'],
    ['git push origin HEAD', 'fix/typo'],
    ['git push -u origin rc/v1.1.0', 'develop'],
    ['git push origin v1.1.0', 'main'],
    ['git push origin v1.1.0', 'develop'],
    ['git push origin v1.1.0', 'feat/x'],
    // the exact /deploy chains
    ['git fetch origin && git tag v1.1.0 origin/main && git push origin v1.1.0', 'develop'],
    ['git fetch origin && git tag v1.1.0 origin/main && git push origin v1.1.0', 'main'],
    ['git fetch origin && git tag v1.1.0 origin/main && git push origin v1.1.0', 'rc/v1.1.0'],
    [
      'git fetch origin && git switch -c rc/v1.1.0 origin/main && git push -u origin rc/v1.1.0',
      'develop',
    ],
    ['git fetch origin --tags', 'develop'],
    ['git rev-list origin/main..origin/develop', 'develop'],
    ['git describe --tags --abbrev=0 origin/main', 'develop'],
    ['git switch develop && git pull && git branch -D rc/v1.1.0', 'rc/v1.1.0'],
    ['git switch develop && git branch -D rc/v1.1.0', 'rc/v1.1.0'],
    ['git rev-parse origin/main', 'rc/v1.1.0'],
    // the work-PR finish
    ['git push -u origin feat/x', 'feat/x'],
    ['git push origin --tags', 'develop'],
    ['git push origin refs/tags/v1.1.0:refs/tags/v1.1.0', 'develop'],
    ['git tag v1.1.0 origin/main', 'develop'],
    ['git tag -a v1.1.0 -m "Release v1.1.0" origin/main', 'main'],
    ['git tag -l', 'main'],
    ['git push origin refs/tags/v1.1.0', 'develop'],
    ['git push origin --delete feat/x', 'develop'],
    ['git switch -c fix/typo', 'develop'],
    ['git switch -c feat/tool-json-formatter', 'develop'],
    ['git switch -c rc/v1.1.0 origin/main', 'develop'],
    ['git checkout -b feat/x', 'develop'],
    ['git switch develop && git pull', 'feat/x'],
    ['git branch', 'develop'],
    ['git branch -a', 'develop'],
    ['git branch -d content/old', 'develop'],
    ['git fetch origin && git tag v1.1.0 origin/main', 'develop'],
    ['git merge --abort', 'develop'],
    ['git status', 'main'],
    ['npm run verify', 'main'],
    // branch changes are followed through && chains
    ['git switch -c feat/y && git commit -m x', 'develop'],
    ['git checkout -b fix/y && git commit -m x && git push -u origin fix/y', 'develop'],
    ['git switch feat/x && git commit -m x && git push', 'develop'],
    ['git checkout feat/x && git rebase develop', 'main'],
    ['git switch develop && git pull && git switch -c feat/y', 'feat/x'],
    // redirections are not commands or arguments
    ['git push -u origin feat/x 2>&1', 'feat/x'],
    ['git push origin feat/x > /dev/null', 'feat/x'],
    ['git push origin feat/x >>log.txt 2>&1', 'feat/x'],
    ['git push origin feat/x &> /dev/null', 'feat/x'],
    ['git branch 2>/dev/null', 'develop'],
    ['git log --oneline < /dev/null | head -5', 'main'],
    // comments and here-doc bodies are not commands
    ['git status # then git push origin main', 'feat/x'],
    ["cat <<'EOF' > notes.txt\ngit push origin main\nEOF\ngit status", 'feat/x'],
    ['git commit -m "$(cat <<\'EOF\'\nAdd x\n\ngit push origin main\nEOF\n)"', 'feat/x'],
    // fast-forward updates of long-lived branches
    ['git pull', 'develop'],
    ['git pull --ff-only', 'develop'],
    ['git pull --ff-only origin main', 'main'],
    ['git merge --ff-only origin/develop', 'develop'],
    ['git rebase develop', 'feat/x'],
    ['git cherry-pick abc123', 'fix/y'],
    ['git rebase --continue', 'HEAD'],
    ['git commit -m "wip"', 'HEAD'],
    ['command git commit -m x', 'feat/x'],
    ['env GIT_PAGER=cat git log', 'main'],
    // wrappers the guard can see through
    ['time git push origin feat/x', 'feat/x'],
    ['git commit -m "the git hook blocks git push origin main"', 'feat/x'],
    ["git log --format='%s' | grep 'git'", 'main'],
    ['echo "$(git rev-parse HEAD)"', 'main'],
    ['bash -c "git status"', 'main'],
    // directories inside the project keep the branch
    ['cd /c/repos/portfolio && git commit -m x', 'feat/x'],
    ['cd src && git commit -m x', 'feat/x'],
    ['cd /tmp && cd C:/repos/portfolio/docs && git commit -m x', 'feat/x'],
    ['git -C src commit -m x', 'feat/x'],
    ['git -C /c/repos/portfolio switch -c feat/y && git commit -m x', 'develop'],
    // rc branches are pushed only from themselves
    ['git push -u origin rc/v1.1.0', 'rc/v1.1.0'],
    ['git push', 'rc/v1.1.0'],
    ['git push origin HEAD', 'rc/v1.1.0'],
    ['git push origin rc/v1.1.0:rc/v1.1.0', 'develop'],
    // attached option forms with valid names
    ['git switch --create=feat/y', 'develop'],
    ['git switch -cfix/y', 'develop'],
    ['git checkout -bfeat/y', 'develop'],
    // unstaging on protected branches
    ['git reset', 'develop'],
    ['git reset -q', 'main'],
    ['git reset -- src/i18n/en.ts', 'develop'],
    ['git reset src/i18n/en.ts README.md', 'develop'],
    ['git reset HEAD -- README.md', 'main'],
    ['git reset .', 'rc/v1.1.0'],
  ])('allows `%s` on %s', (command, branch) => {
    expect(check(command, branch)).toBeNull();
  });

  it.each([
    ['git commit -m "x"', 'main', /do not commit on main/],
    ['git commit -m "x"', 'develop', /do not commit on develop/],
    ['git commit -m "x"', 'rc/v1.1.0', /do not commit on rc\/v1\.1\.0/],
    ['git -C . commit -m "x"', 'develop', /do not commit on develop/],
    ['cd repo && git add . && git commit -m "x"', 'main', /do not commit on main/],
    ['git merge feat/x', 'develop', /do not merge on develop/],
    ['git merge develop', 'main', /do not merge on main/],
    ['git push --force', 'feat/x', /force/],
    ['git push -f origin feat/x', 'feat/x', /force/],
    ['git push --force-with-lease origin feat/x', 'feat/x', /force/],
    ['git push origin +feat/x', 'feat/x', /force/],
    ['git -C . push origin main', 'feat/x', /do not push to main/],
    ['git -c core.pager=cat push origin HEAD:main', 'feat/x', /do not push to main/],
    ['git push origin feat/x:refs/heads/main', 'feat/x', /do not push to main/],
    ['git push origin develop', 'feat/x', /do not push to develop/],
    ['git push origin --delete develop', 'feat/x', /do not push to develop/],
    ['git push', 'develop', /do not push to develop/],
    ['git push', 'main', /do not push to main/],
    ['git push -u origin content/x', 'content/x', /not allowed/],
    ['git push', 'chore/line-endings', /not allowed/],
    ['git push --all', 'feat/x', /--all/],
    ['git switch -c content/x', 'develop', /not an allowed branch name/],
    ['git switch -c develop', 'main', /not an allowed branch name/],
    ['git checkout -b Feat/X', 'develop', /not an allowed branch name/],
    ['git branch content/x', 'develop', /not an allowed branch name/],
    ['git branch -m feat/x feature/x', 'feat/x', /not an allowed branch name/],
    ['git switch -c rc/1.1 origin/main', 'develop', /not an allowed branch name/],
    ['git branch -f develop origin/main', 'feat/x', /not an allowed branch name/],
    // branch tracking through chains
    ['git switch main && git commit -m x && git push', 'feat/x', /do not commit on main/],
    ['git checkout develop && git merge feat/x', 'feat/x', /do not merge on develop/],
    ['git switch -c feat/y; git commit -m x', 'develop', /cannot tell which branch/],
    ['git switch feat/y || git commit -m x', 'develop', /cannot tell which branch/],
    ['git checkout README.md && git commit -m x', 'feat/x', /cannot tell which branch/],
    ['git switch - && git push', 'feat/x', /cannot tell which branch/],
    // unknown current branch fails closed
    ['git commit -m x', '', /cannot tell which branch/],
    ['git merge feat/x', '', /cannot tell which branch/],
    ['git push', '', /cannot tell which branch/],
    ['git push', 'HEAD', /detached/],
    // redirections must not hide a target
    ['git push origin develop 2>&1', 'feat/x', /do not push to develop/],
    ['git push origin main >/dev/null', 'feat/x', /do not push to main/],
    // other history-changing commands on protected branches
    ['git merge origin/develop', 'develop', /do not merge on develop/],
    ['git merge --ff-only feat/x', 'develop', /do not merge on develop/],
    ['git pull origin feat/x', 'develop', /do not pull on develop/],
    ['git pull --rebase', 'main', /do not pull on main/],
    ['git cherry-pick abc123', 'main', /do not cherry-pick on main/],
    ['git rebase main', 'develop', /do not rebase on develop/],
    ['git reset HEAD~1', 'develop', /do not reset on develop/],
    ['git reset --soft HEAD~1', 'develop', /do not reset on develop/],
    ['git reset --mixed origin/main', 'main', /do not reset on main/],
    ['git reset --hard', 'main', /do not reset on main/],
    ['git reset --keep feat/x', 'develop', /do not reset on develop/],
    ['git reset abc1234', 'develop', /do not reset on develop/],
    ['git reset Makefile', 'develop', /do not reset on develop/],
    ['git reset HEAD@{1}', 'develop', /do not reset on develop/],
    ['git reset v1.0.0 -- src', 'main', /do not reset on main/],
    // git hidden behind wrappers and substitutions
    ['time git push origin main', 'feat/x', /do not push to main/],
    ['nohup git push origin develop', 'feat/x', /do not push to develop/],
    ['xargs git push origin main', 'feat/x', /do not push to main/],
    ['xargs -n 1 -I {} git push origin main', 'feat/x', /do not push to main/],
    ['if git commit -m x; then :; fi', 'develop', /do not commit on develop/],
    ['! git commit -m x', 'develop', /do not commit on develop/],
    ['{ git commit -m x; }', 'develop', /do not commit on develop/],
    ['( git commit -m x )', 'develop', /do not commit on develop/],
    ['exec git commit -m x', 'develop', /do not commit on develop/],
    ['echo $(git commit -m x)', 'develop', /do not commit on develop/],
    ['echo `git commit -m x`', 'develop', /do not commit on develop/],
    ['echo "$(git commit -m x)"', 'develop', /do not commit on develop/],
    ['echo "`git push origin main`"', 'feat/x', /do not push to main/],
    ['bash -c "git commit -m x"', 'develop', /do not commit on develop/],
    ["sh -c 'cd src && git push origin develop'", 'feat/x', /do not push to develop/],
    ['bash -lc "git commit -m x"', 'develop', /do not commit on develop/],
    ['eval "git commit -m x"', 'develop', /do not commit on develop/],
    ['sudo git commit -m x', 'feat/x', /run git as a plain command/],
    ['find . -name x -exec git add {} ;', 'feat/x', /run git as a plain command/],
    ['/usr/bin/env -S git commit -m x', 'feat/x', /run git as a plain command/],
    ['watch /usr/bin/git status', 'feat/x', /run git as a plain command/],
    ['powershell git.exe push origin main', 'feat/x', /run git as a plain command/],
    // directories outside the project: branch unknown
    ['cd /tmp/other && git commit -m x', 'feat/x', /cannot tell which branch/],
    ['cd .. && git commit -m x', 'feat/x', /cannot tell which branch/],
    ['cd ~ && git commit -m x', 'feat/x', /cannot tell which branch/],
    ['cd "$REPO" && git commit -m x', 'feat/x', /cannot tell which branch/],
    ['cd src; git commit -m x', 'feat/x', /cannot tell which branch/],
    ['git -C ../other commit -m x', 'feat/x', /cannot tell which branch/],
    ['git -C /tmp/other push', 'feat/x', /cannot tell which branch/],
    ['git --git-dir=/tmp/x/.git commit -m x', 'feat/x', /cannot tell which branch/],
    ['git -C ../other switch feat/y && git commit -m x', 'feat/x', /cannot tell which branch/],
    // rc branches only receive their own branch
    ['git push origin feat/x:rc/v1.2.0', 'feat/x', /rc\/v1\.2\.0 may only be pushed from/],
    ['git push origin HEAD:rc/v1.1.0', 'feat/x', /rc\/v1\.1\.0 may only be pushed from/],
    ['git push origin develop:refs/heads/rc/v1.1.0', 'develop', /may only be pushed from/],
    ['git push origin --delete rc/v1.1.0', 'develop', /do not delete release branches/],
    ['git push origin :rc/v1.1.0', 'develop', /do not delete release branches/],
    // attached option forms are validated too
    ['git switch --create=content/x', 'develop', /"content\/x" is not an allowed branch name/],
    ['git switch --force-create=develop', 'feat/x', /"develop" is not an allowed branch name/],
    ['git switch --orphan=tmp', 'feat/x', /"tmp" is not an allowed branch name/],
    ['git switch -ccontent/x', 'develop', /"content\/x" is not an allowed branch name/],
    ['git checkout -bcontent/x', 'develop', /"content\/x" is not an allowed branch name/],
    ['git checkout -Bmain', 'feat/x', /"main" is not an allowed branch name/],
    ['git checkout --orphan=gh-pages', 'feat/x', /"gh-pages" is not an allowed branch name/],
    ['git am patch.mbox', 'rc/v1.1.0', /do not am on rc\/v1\.1\.0/],
    ['git revert abc123', 'main', /do not revert on main/],
    ['git merge develop', 'rc/v1.1.0', /do not merge on rc\/v1\.1\.0/],
    ['command git commit -m x', 'develop', /do not commit on develop/],
    ['env -i git commit -m x', 'main', /do not commit on main/],
    ['FOO=1 git commit -m x', 'main', /do not commit on main/],
    // tags are permanent; only plain vX.Y.Z refspecs count as tag pushes
    ['git tag -d v1.0.0', 'develop', /tags/],
    ['git tag -f v1.0.0 HEAD', 'develop', /tags/],
    ['git tag --delete v1.0.0', 'develop', /tags/],
    ['git push origin --delete v1.0.0', 'develop', /delete release tags/],
    ['git push origin :refs/tags/v1.0.0', 'develop', /delete release tags/],
    ['git push origin main:v9.9.9', 'feat/x', /not allowed/],
    ['git push origin feat/x:refs/tags/v9.9.9', 'feat/x', /not allowed/],
    ['git push origin :', 'feat/x', /every matching branch/],
  ])('blocks `%s` on %s', (command, branch, message) => {
    expect(check(command, branch)).toMatch(message);
  });
});

describe('planPrCheck', () => {
  const sha = 'a'.repeat(40);

  it('skips when the run is not a pull request', () => {
    expect(planPrCheck({}).status).toBe('skip');
    expect(planPrCheck({ base: 'main' }).status).toBe('skip');
  });

  it.each([
    ['develop', 'feat/x'],
    ['rc/v1.1.0', 'develop'],
  ])('passes %s ← %s without an ancestry check', (base, head) => {
    expect(planPrCheck({ base, head, headSha: sha }).status).toBe('pass');
  });

  it('fails a PR the flow does not allow', () => {
    const plan = planPrCheck({ base: 'main', head: 'feat/x', headSha: sha });
    expect(plan.status).toBe('fail');
    expect(plan.message).toMatch(/feat\/x → main is not allowed/);
  });

  it('asks for an ancestry check of the PR head against origin/main for a release PR', () => {
    expect(planPrCheck({ base: 'main', head: 'rc/v1.1.0', headSha: sha })).toMatchObject({
      status: 'check-ancestry',
      ancestor: 'origin/main',
      commit: sha,
    });
  });

  it.each([undefined, '', 'HEAD', 'abc123', `${sha}; rm -rf /`])(
    'fails a release PR when PR_HEAD_SHA is %j (no fallback to HEAD)',
    (headSha) => {
      const plan = planPrCheck({ base: 'main', head: 'rc/v1.1.0', headSha });
      expect(plan.status).toBe('fail');
      expect(plan.message).toMatch(/PR_HEAD_SHA/);
    },
  );
});

describe('checkGitCommand without a project context', () => {
  it('uses the given branch for commands in the starting directory', () => {
    expect(checkGitCommand('git commit -m x', 'develop')).toMatch(/do not commit on develop/);
    expect(checkGitCommand('git commit -m x', 'feat/x')).toBeNull();
  });

  it('treats any cd as leaving the repository (fail closed)', () => {
    expect(checkGitCommand('cd src && git commit -m x', 'feat/x')).toMatch(/cannot tell/);
  });
});

describe('checkGitCommand with a cwd outside the project', () => {
  const context = { projectDir: '/home/jan/portfolio', cwd: '/home/jan/other' };

  it('tracks the branch of the starting directory, not the project', () => {
    expect(checkGitCommand('git commit -m x', 'feat/x', context)).toBeNull();
    expect(checkGitCommand('cd sub && git commit -m x', 'feat/x', context)).toBeNull();
  });

  it('treats cd into the project as a different repository', () => {
    expect(checkGitCommand('cd /home/jan/portfolio && git commit -m x', 'feat/x', context)).toMatch(
      /cannot tell/,
    );
  });
});

describe('checkGitCommand: local review gate', () => {
  // The hook reads these facts for the current branch; the policy itself stays pure.
  const project = { projectDir: 'C:\\repos\\portfolio', cwd: '/c/repos/portfolio' };
  const head = 'b'.repeat(40);
  const older = 'a'.repeat(40);
  const reviews = {
    none: { head, approved: '', approvedIsAncestor: false, onOrigin: false },
    stale: { head, approved: older, approvedIsAncestor: true, onOrigin: false },
    unrelated: { head, approved: older, approvedIsAncestor: false, onOrigin: true },
    approved: { head, approved: head, approvedIsAncestor: false, onOrigin: false },
    // a red-CI fix on top of the reviewed commit, on a branch that already has a PR
    redCiFix: { head, approved: older, approvedIsAncestor: true, onOrigin: true },
  };
  type Review = keyof typeof reviews;
  const check = (command: string, branch: string, review: Review) =>
    checkGitCommand(command, branch, { ...project, review: reviews[review] });

  const publishing = [
    ['git push -u origin feat/x', 'feat/x'],
    ['git push -u origin fix/typo', 'fix/typo'],
    ['git push', 'feat/x'],
    ['git push origin HEAD', 'fix/typo'],
    ['git push origin HEAD:feat/x', 'feat/x'],
    ['gh pr create --base develop --fill', 'feat/x'],
    ['gh pr create -B develop --fill', 'fix/typo'],
    ['gh pr create --base=develop --head feat/x --fill', 'feat/x'],
    ['gh pr create --fill', 'feat/x'], // no --base: still a work branch's PR
    ['bash -c "gh pr create --base develop --fill"', 'feat/x'],
  ];

  it.each(publishing)('blocks `%s` on %s without an approval', (command, branch) => {
    expect(check(command, branch, 'none')).toMatch(/local review loop/);
  });

  it.each(publishing)('blocks `%s` on %s with a stale approval', (command, branch) => {
    expect(check(command, branch, 'stale')).toMatch(/review/);
    expect(check(command, branch, 'unrelated')).toMatch(/review/);
  });

  it.each(publishing)('allows `%s` on %s when the approval is for HEAD', (command, branch) => {
    expect(check(command, branch, 'approved')).toBeNull();
  });

  it.each(publishing)(
    'allows `%s` on %s for a fix on top of the approval when the branch is on origin',
    (command, branch) => {
      expect(check(command, branch, 'redCiFix')).toBeNull();
    },
  );

  it('names both commits when the approval is stale', () => {
    const message = check('git push -u origin feat/x', 'feat/x', 'stale');
    expect(message).toContain(older.slice(0, 12));
    expect(message).toContain(head.slice(0, 12));
    expect(message).toMatch(/local review loop/);
  });

  it('describes the current review model in its advice', () => {
    for (const review of ['none', 'stale'] as const) {
      const message = check('git push -u origin feat/x', 'feat/x', review) ?? '';
      expect(message).toContain('**Loop:** done');
      expect(message).toMatch(/final gate/);
      expect(message).not.toMatch(/fresh reviewer/);
    }
  });

  it.each([
    // HEAD moves before the push, so the approval read before the command does not apply
    ['git commit -m x && git push -u origin feat/x', 'feat/x'],
    ['git switch -c feat/y && git push -u origin feat/y', 'feat/x'],
    ['git switch feat/y && gh pr create --base develop --fill', 'feat/x'],
    // a branch other than the one checked out
    ['git push -u origin feat/y', 'feat/x'],
    ['git push -u origin feat/x', 'develop'],
    ['gh pr create --base develop --head feat/y --fill', 'feat/x'],
    ['gh pr create --base develop --head JanPodzimek:feat/y --fill', 'feat/x'],
    ['cd /tmp && gh pr create --base develop --fill', 'feat/x'],
  ])('blocks `%s` on %s even with an approval for HEAD', (command, branch) => {
    expect(check(command, branch, 'approved')).toMatch(/review/);
  });

  it.each([
    // /deploy: rc branches, release PRs and tags never need the local review
    [
      'git fetch origin && git switch -c rc/v1.2.3 origin/main && git push -u origin rc/v1.2.3',
      'develop',
    ],
    ['git push -u origin rc/v1.2.3', 'rc/v1.2.3'],
    ['git fetch origin && git tag v1.2.3 origin/main && git push origin v1.2.3', 'develop'],
    ['git push origin v1.2.3', 'main'],
    [
      'gh pr create --base rc/v1.2.3 --head develop --title "Release v1.2.3" --body-file x',
      'develop',
    ],
    ['gh pr create --base main --head rc/v1.2.3 --title "Release v1.2.3" --body-file x', 'develop'],
    // reading or deleting does not publish unreviewed work
    ['git push origin --delete feat/x', 'develop'],
    ['gh pr view --json state,mergeStateStatus,mergeCommit', 'feat/x'],
    ['gh pr comment --body-file x', 'feat/x'],
    ['git status', 'feat/x'],
  ])('does not gate `%s` on %s', (command, branch) => {
    expect(check(command, branch, 'none')).toBeNull();
  });

  it('keeps the branch rules in force (a force push stays blocked when approved)', () => {
    expect(check('git push -f origin feat/x', 'feat/x', 'approved')).toMatch(/force/);
  });
});
