// Checks the contract between the local review loop and its two agents: the reviewer takes the
// previous round's findings, reviews the delta (or the full diff in round 1, the fallback and
// the final gate), resists anchoring and reports whether the loop is done;
// the implementer answers every finding with a fix commit or a reasoned dispute.
import { describe, expect, it } from 'vitest';
import { text } from './skillDocs';

/** Prose wraps at 100 characters, so phrases are matched with each whitespace run as a space. */
const flat = (markdown: string) => markdown.replace(/\s+/g, ' ');
const reviewer = text('.claude/agents/reviewer.md');
const review = text('.claude/skills/review/SKILL.md');
const implementer = text('.claude/agents/implementer.md');

describe('reviewer agent', () => {
  it('reports whether the loop is done and which commit it reviewed', () => {
    expect(reviewer).toContain('**Loop:** done | another round');
    expect(reviewer).toMatch(/\*\*Head:\*\*/);
    expect(reviewer).toContain('git rev-parse HEAD');
  });

  it('judges each previous finding', () => {
    for (const status of ['closed', 'still open', 'dispute accepted'])
      expect(reviewer).toContain(`**${status}**`);
  });

  it('needs a full-diff review only for round 1, the fallback and the final gate', () => {
    expect(flat(reviewer)).toMatch(
      /full-diff review is required for round 1, the fallback and the final gate/,
    );
    expect(reviewer).not.toMatch(/fresh\s+every\s+round/);
  });

  it('blocks on blocker, major and minor findings, never on nits', () => {
    expect(reviewer).toMatch(/Blocker, major and minor findings block; nits never do/);
  });

  // One rule everywhere: an open previous item blocks only at blocker, major or minor severity,
  // so a nit left for the PR body can never keep the loop running.
  it('lets only blocker, major or minor previous items keep the loop going', () => {
    expect(reviewer).toMatch(/still-open blocker, major or minor item\s+blocks the loop/);
    expect(reviewer).toMatch(/a\s+still-open nit never does/);
    expect(reviewer).toMatch(/any\s+still-open\s+blocker, major or minor\s+previous item/);
    expect(reviewer).not.toMatch(/any\s+still-open\s+previous\s+item/);
  });

  it('still refuses to invent findings', () => {
    expect(reviewer).toMatch(/do not invent any/);
  });
});

describe('reviewer agent: resumed round', () => {
  const resumed = flat(/^## \d+\. Resumed round$([\s\S]*?)(?=^## )/m.exec(reviewer)?.[1] ?? '');

  it('has a resumed-round section', () => {
    expect(resumed).not.toBe('');
  });

  it('reviews the delta since the previous Head and how it interacts with the branch', () => {
    expect(resumed).toContain('git diff <previous Head>..HEAD');
    expect(resumed).toMatch(/how the delta interacts with the rest of the branch\s+diff/);
  });

  // Anti-anchoring: a reviewer that stays across rounds must not be talked out of its findings
  // or start nitpicking code it already passed.
  it('accepts a dispute only with a stated technical reason', () => {
    expect(resumed).toMatch(/accept a dispute only with a stated technical\s+reason/i);
  });

  it('never softens a blocker or major finding because of pushback', () => {
    expect(resumed).toMatch(
      /never drop or downgrade a blocker or major finding\s+because of\s+pushback/i,
    );
    expect(resumed).toMatch(/second dispute on the same item means the finding is upheld[^.]*Jan/i);
  });

  it('raises new findings on code it already passed only at blocker or major', () => {
    expect(resumed).toMatch(
      /code you already passed[^.]*only if (it is|they are)\s+blocker or major/i,
    );
    expect(resumed).toMatch(/no new nits or minors on untouched code/i);
  });

  it('treats out-of-scope changes in the delta as a minor finding', () => {
    expect(resumed).toMatch(/out-of-scope change[^.]*delta[^.]*minor finding/i);
  });

  it('runs verify:fast every round and build + e2e only before approving', () => {
    expect(resumed).toMatch(/`npm run verify:fast` every round/);
    expect(resumed).toMatch(/only in the round where you are about to\s+approve/);
    expect(resumed).toMatch(/only if `src\/` or `tests\/e2e\/` changed since\s+your last e2e run/);
  });
});

describe('/review skill', () => {
  it('stays a forked reviewer context and accepts the loop input', () => {
    expect(review).toMatch(/^context: fork$/m);
    expect(review).toMatch(/^agent: reviewer$/m);
    expect(review).toMatch(/previous round's\s+findings/);
  });
});

describe('implementer agent', () => {
  it('answers every finding as fixed or disputed', () => {
    expect(implementer).toMatch(/## Responding to review/);
    expect(implementer).toMatch(/fixed in <short sha>/);
    expect(implementer).toMatch(/disputed: </);
  });

  it('leaves a nit with a plain answer that needs no further reason', () => {
    expect(implementer).toMatch(/`disputed: nit, left for the PR body`/);
    expect(implementer).not.toMatch(/not worth it now/);
  });

  it('no longer expects a fresh reviewer every round', () => {
    expect(implementer).not.toMatch(/fresh reviewer per round/);
  });

  it('still never pushes or writes the approval', () => {
    expect(implementer).toMatch(/Commit to `main`, `develop` or `rc\/\*`, push, open or merge PRs/);
    expect(implementer).toMatch(/Do not write the review approval marker/);
  });
});

describe('docs: one reviewer per change', () => {
  const claude = flat(text('CLAUDE.md'));
  const workflow = flat(text('docs/agentic-workflow.md'));

  it('no longer describe a fresh reviewer every round', () => {
    for (const doc of [claude, workflow])
      expect(doc).not.toMatch(
        /fresh `?reviewer`? agent per round|new reviewer each round|starts a \*\*new\*\* reviewer instead of resuming/,
      );
  });

  // The cap includes the gate: "5 rounds plus a gate" would contradict the skills.
  it('count the final gate inside the 5-round cap', () => {
    expect(claude).toMatch(/at most 5 rounds, the final gate included/);
    expect(claude).not.toMatch(/plus a fresh final gate/);
  });

  it('describe the persistent reviewer and the risk-triggered final gate', () => {
    for (const doc of [claude, workflow]) {
      expect(doc).toMatch(/one `?reviewer`? (agent )?per change/);
      expect(doc).toMatch(/final gate/);
    }
    // why: independence from the implementer, and the PR #11 evidence
    expect(workflow).toMatch(/independence that matters is from the implementer/i);
    expect(workflow).toMatch(/PR #11/);
    expect(workflow).toMatch(/anti-anchoring/);
  });
});
