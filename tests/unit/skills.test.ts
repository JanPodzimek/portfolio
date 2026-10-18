// Checks the merge and release-gate steps in the skills. GitHub runs a queued auto-merge some
// time after the required checks pass (seen: ~80 s), and `gh pr checks --watch` returns at once
// when the checks are already done, so "watch again and view again" cannot bridge that gap
// without `sleep` (which auto mode refuses). The skills therefore merge a CLEAN, not yet merged
// PR directly with the same method; the rulesets (no bypass actors, required checks) keep that
// direct merge from skipping a check.
import { describe, expect, it } from 'vitest';
import { commandsIn, skills, text } from './skillDocs';

/** `gh pr merge` commands that name a merge method (prose may mention a bare `gh pr merge`). */
const merges = (file: string) =>
  commandsIn(text(file)).filter((c) => /^gh pr merge\b.*\s--(squash|merge|rebase)\b/.test(c));
const queued = (file: string) => merges(file).filter((c) => /\s--auto\b/.test(c));
const mergeSkills = skills.filter((file) => queued(file).length > 0);

describe('skills: merging a PR', () => {
  it('finds the skills that queue an auto-merge', () => {
    expect(mergeSkills.sort()).toEqual(
      ['add-content', 'deploy', 'fix-bug', 'new-feature', 'new-tool']
        .map((d) => `.claude/skills/${d}/SKILL.md`)
        .sort(),
    );
  });

  it.each(skills)('%s: has no "up to 3 rounds" of watching for the auto-merge', (file) => {
    expect(text(file)).not.toMatch(/up to 3 rounds/i);
  });

  it.each(mergeSkills)(
    '%s: merges a CLEAN but not MERGED PR directly with the same method',
    (file) => {
      const commands = merges(file);
      for (const command of queued(file)) {
        const direct = command
          .replace(/\s--auto\b/, '')
          .replace(/\s+/g, ' ')
          .trim();
        expect(commands).toContain(direct);
      }
      expect(text(file)).toMatch(/`CLEAN`/);
      expect(text(file)).toMatch(/`MERGED`/);
    },
  );

  it('uses squash for work PRs and a merge commit for releases', () => {
    for (const file of mergeSkills) {
      const method = file.includes('/deploy/') ? '--merge' : '--squash';
      for (const command of merges(file)) {
        expect(command).toContain(method);
        expect(command).not.toContain('--rebase');
      }
    }
  });
});

describe('deploy: release gate', () => {
  const deploy = text('.claude/skills/deploy/SKILL.md');
  const smokeLists = commandsIn(deploy).filter((c) =>
    c.startsWith('gh run list --workflow "Production smoke"'),
  );

  it('lists enough "Production smoke" runs to skip the skipped ones', () => {
    expect(smokeLists.length).toBeGreaterThan(0);
    for (const command of smokeLists) {
      expect(command).toContain('--limit 10');
      expect(command).toContain('conclusion');
    }
    expect(deploy).toMatch(/not\s+`skipped`/);
  });

  it('no longer asks to confirm branch-policy in "this PR\'s run"', () => {
    expect(deploy).not.toMatch(/this PR's run/);
    expect(deploy).not.toMatch(/only manual merge allowed/);
  });
});
