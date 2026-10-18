import { describe, expect, it } from 'vitest';
import {
  checkGitCommand,
  checkPrBranches,
  FEATURE_BRANCH,
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
  it.each([
    ['git commit -m "Add x"', 'feat/x'],
    ['git commit -m "Fix y"', 'fix/typo'],
    ['git commit -m "mentions git push origin main in text"', 'feat/x'],
    ['git push -u origin feat/x', 'develop'],
    ['git push', 'feat/x'],
    ['git push origin HEAD', 'fix/typo'],
    ['git push -u origin rc/v1.1.0', 'develop'],
    ['git push origin v1.1.0', 'main'],
    ['git push origin --tags', 'develop'],
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
  ])('allows `%s` on %s', (command, branch) => {
    expect(checkGitCommand(command, branch)).toBeNull();
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
  ])('blocks `%s` on %s', (command, branch, message) => {
    expect(checkGitCommand(command, branch)).toMatch(message);
  });
});
