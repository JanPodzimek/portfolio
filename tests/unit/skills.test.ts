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

  /** The text of the merge-rule bullet that starts with `` `<state>` ``, up to the next bullet. */
  const bullet = (file: string, state: string) =>
    new RegExp(`^\\s*- \`${state}\`[\\s\\S]*?(?=^\\s*- \`|^\\s*$)`, 'm').exec(text(file))?.[0] ??
    '';
  const checksIn = (part: string) =>
    [...part.matchAll(/`(gh pr checks[^`]*)`/g)].map(([, c]) => c.replace(/\s+/g, ' '));

  it.each(mergeSkills)('%s: handles each merge state in its own bullet', (file) => {
    for (const state of ['MERGED', 'CLEAN', 'BLOCKED', 'DIRTY', 'UNKNOWN', 'UNSTABLE'])
      expect(bullet(file, state), state).not.toBe('');
    // UNKNOWN (still computing) and UNSTABLE (a non-required check) need different handling.
    expect(bullet(file, 'UNKNOWN')).not.toMatch(/`UNSTABLE`/);
    // A merge conflict (DIRTY) stops at once; it must not hide inside the BLOCKED retry loop.
    expect(bullet(file, 'BLOCKED')).not.toMatch(/DIRTY/);
  });

  it.each(mergeSkills)('%s: UNSTABLE looks at all checks, not only the required ones', (file) => {
    const checks = checksIn(bullet(file, 'UNSTABLE'));
    expect(checks.some((c) => !c.includes('--required') && !c.includes('--watch'))).toBe(true);
    expect(checks.some((c) => c.includes('--watch') && !c.includes('--required'))).toBe(true);
    expect(bullet(file, 'UNSTABLE')).toMatch(/fail/i);
  });

  // Without a cap, a check that stays pending (e.g. a stuck Vercel preview) loops forever.
  it.each(mergeSkills)('%s: BLOCKED and UNSTABLE retry at most 5 times, then stop', (file) => {
    for (const state of ['BLOCKED', 'UNSTABLE']) {
      expect(bullet(file, state), state).toMatch(/up to 5\s+times/);
      expect(bullet(file, state), state).toMatch(/stop and\s+report/i);
    }
  });

  it.each(mergeSkills)('%s: BLOCKED checks the required checks before stopping', (file) => {
    expect(checksIn(bullet(file, 'BLOCKED')).some((c) => c.includes('--required'))).toBe(true);
  });

  it.each(mergeSkills)('%s: a failed direct merge is followed by another view', (file) => {
    expect(bullet(file, 'CLEAN')).toMatch(/already merged/i);
    expect(bullet(file, 'CLEAN')).toMatch(/any other error/i);
  });

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

describe('work skills: local review loop', () => {
  const workSkills = ['add-content', 'fix-bug', 'new-feature', 'new-tool'].map(
    (d) => `.claude/skills/${d}/SKILL.md`,
  );
  /** The numbered step that starts with **Local review loop.**, without its number. */
  const loop = (file: string) =>
    /^\d+\. (\*\*Local review loop\.\*\*[\s\S]*?)(?=^\d+\. )/m.exec(text(file))?.[1] ?? '';

  it.each(workSkills)('%s: has a local review loop step', (file) => {
    expect(loop(file)).not.toBe('');
  });

  it('uses the same loop block in every work skill', () => {
    const [first, ...rest] = workSkills.map(loop);
    for (const block of rest) expect(block).toBe(first);
  });

  /** The loop block with each whitespace run as one space, so wrapped phrases still match. */
  const flatLoop = (file: string) => loop(file).replace(/\s+/g, ' ');

  it.each(workSkills)('%s: starts one new reviewer in round 1 and keeps its id', (file) => {
    expect(flatLoop(file)).toMatch(/Round 1: a new reviewer\./);
    expect(flatLoop(file)).toMatch(/`subagent_type: reviewer`/);
    expect(flatLoop(file)).toMatch(/keep its agent id/);
    expect(flatLoop(file)).not.toMatch(/new reviewer every round|never resume/i);
  });

  it.each(workSkills)('%s: resumes the same reviewer with a delta template', (file) => {
    expect(flatLoop(file)).toMatch(/Rounds 2 and later: the same reviewer\./);
    expect(flatLoop(file)).toMatch(/SendMessage to that agent id/);
    expect(loop(file)).toMatch(/Previous Head: <sha>/);
    expect(loop(file)).toMatch(/New HEAD: <sha>/);
    expect(flatLoop(file)).toMatch(/never pass the implementer's summary/i);
  });

  it.each(workSkills)('%s: falls back to a new full-diff reviewer if resuming fails', (file) => {
    expect(flatLoop(file)).toMatch(/\*\*Fallback\.\*\*/);
    expect(flatLoop(file)).toMatch(/start a new reviewer with the full-diff template/);
    expect(flatLoop(file)).toMatch(/previous findings/i);
  });

  it.each(workSkills)('%s: runs a fresh final gate only when the change is risky', (file) => {
    const block = flatLoop(file);
    expect(block).toMatch(/\*\*Final gate, only when risky\.\*\*/);
    expect(block).toMatch(/a \*\*new\*\* `reviewer`/);
    // the three triggers
    expect(block).toMatch(/took 3 or more rounds/);
    expect(block).toMatch(/accepted a dispute/);
    expect(block).toContain('`git diff --name-only develop...HEAD`');
    for (const path of [
      '.claude/hooks/',
      '.github/workflows/',
      '.claude/settings.json',
      'scripts/',
    ])
      expect(block).toContain(`\`${path}\``);
    // what happens to its findings
    expect(block).toMatch(/no second gate/);
    expect(block).toMatch(/Its nits go in the PR body/);
    expect(block).toMatch(/No trigger: the persistent reviewer's approval is final/);
    expect(block).toMatch(/counts every round, including the final gate/);
    // a gate that would be round 6, or gate fixes past round 5, stop the loop
    expect(block).toMatch(/if the gate would be round 6, or its fixes need a round past 5, stop/);
  });

  it.each(workSkills)(
    '%s: stops and asks Jan when a finding is upheld after a second dispute',
    (file) => {
      expect(flatLoop(file)).toMatch(
        /upheld after a second dispute[^.]*stop: do not push, and ask Jan/,
      );
    },
  );

  it.each(workSkills)('%s: writes the marker only after the final gate', (file) => {
    const block = loop(file);
    expect(block.indexOf('**Approve.**')).toBeGreaterThan(block.indexOf('**Final gate'));
    expect(flatLoop(file)).toMatch(/only after the final gate passed or was skipped/i);
  });

  it.each(workSkills)('%s: sends findings back to the same implementer', (file) => {
    expect(loop(file)).toMatch(/\*\*same\*\* `implementer`/);
    expect(loop(file)).toMatch(/SendMessage/);
    expect(loop(file)).toMatch(/`fixed in <sha>`/);
    expect(loop(file)).toMatch(/`disputed: <reason>`/);
  });

  it.each(workSkills)('%s: caps the loop at 5 rounds, then asks Jan', (file) => {
    expect(loop(file)).toMatch(/Cap: 5 rounds/);
    expect(loop(file)).toMatch(/at most 5/);
    expect(loop(file)).toMatch(/ask Jan/);
  });

  it.each(workSkills)('%s: exits only without blocker, major or minor findings', (file) => {
    expect(loop(file)).toMatch(/no blocker, major or minor finding/);
    expect(loop(file)).toMatch(/unresolved dispute/);
    expect(loop(file)).toMatch(/Nits never\s+block/);
    // an open nit (or a dispute about one) never blocks the exit or reaches the cap
    expect(loop(file)).toMatch(/every blocker, major or minor\s+previous item\s+closed/);
    expect(loop(file)).not.toMatch(/every previous\s+item\s+closed/);
    expect(loop(file)).toMatch(/unresolved dispute on a blocking\s+item/);
  });

  it.each(workSkills)('%s: writes the approval marker with the Write tool', (file) => {
    expect(loop(file)).toMatch(/Write tool \(not a shell command\)/);
    expect(loop(file)).toMatch(/claude-review\/approved/);
    expect(loop(file)).toMatch(/`git rev-parse HEAD`/);
    expect(loop(file)).toMatch(/`git rev-parse --absolute-git-dir`/);
  });

  it.each(workSkills)('%s: pushes and opens the PR only after the loop', (file) => {
    const body = text(file);
    const loopAt = body.indexOf('**Local review loop.**');
    for (const command of ['git push -u origin', 'gh pr create --base develop']) {
      expect(body.indexOf(command), command).toBeGreaterThan(loopAt);
    }
    expect(loop(file)).not.toMatch(/git push|gh pr create/);
  });

  it.each(workSkills)('%s: no longer stops after two rounds or reviews on the PR', (file) => {
    expect(text(file)).not.toMatch(/two rounds/i);
    expect(text(file)).not.toMatch(/`\/review` verdict without blocker\/major/);
  });

  it.each(workSkills)(
    '%s: a red-CI fix gets no new round unless src/ behaviour changes',
    (file) => {
      expect(text(file)).toMatch(/needs no new review round/);
      expect(text(file)).toMatch(/unless it changes behaviour under `src\/`/);
    },
  );
});
