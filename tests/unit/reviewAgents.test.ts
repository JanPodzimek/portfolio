// Checks the contract between the local review loop and its two agents: the reviewer takes the
// previous round's findings, reviews the whole diff fresh and reports whether the loop is done;
// the implementer answers every finding with a fix commit or a reasoned dispute.
import { describe, expect, it } from 'vitest';
import { text } from './skillDocs';

const reviewer = text('.claude/agents/reviewer.md');
const review = text('.claude/skills/review/SKILL.md');
const implementer = text('.claude/agents/implementer.md');

describe('reviewer agent', () => {
  it('reports whether the loop is done and which commit it reviewed', () => {
    expect(reviewer).toContain('**Loop:** done | another round');
    expect(reviewer).toMatch(/\*\*Head:\*\*/);
    expect(reviewer).toContain('git rev-parse HEAD');
  });

  it('reviews the full diff fresh every round and judges each previous finding', () => {
    expect(reviewer).toMatch(/Review the \*\*full\*\* diff\s+fresh every round/);
    for (const status of ['closed', 'still open', 'dispute accepted'])
      expect(reviewer).toContain(`**${status}**`);
  });

  it('blocks on blocker, major and minor findings, never on nits', () => {
    expect(reviewer).toMatch(/Blocker, major and minor findings block; nits never do/);
  });

  it('still refuses to invent findings', () => {
    expect(reviewer).toMatch(/do not invent any/);
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

  it('still never pushes or writes the approval', () => {
    expect(implementer).toMatch(/Commit to `main`, `develop` or `rc\/\*`, push, open or merge PRs/);
    expect(implementer).toMatch(/Do not write the review approval marker/);
  });
});
