// Keeps the prose in the agent-facing docs and docs/*.md wrapped to 100 characters (Prettier's
// printWidth), so diffs of a reworded sentence stay small and readable. Code fences, tables and
// the YAML frontmatter (skill/agent `description:` lines) are exempt.
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { docs, root, text } from './skillDocs';

const files = [
  ...docs,
  ...readdirSync(new URL('docs/', root))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`),
  'CLAUDE.md',
];

/** Prose lines longer than `max` characters, as `<line number>: <length>`. */
function longProseLines(markdown: string, max = 100): string[] {
  const lines = markdown.split(/\r?\n/);
  const long: string[] = [];
  let frontmatter = lines[0] === '---';
  let fence = false;
  lines.forEach((line, i) => {
    if (frontmatter) {
      if (i > 0 && line === '---') frontmatter = false;
      return;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return;
    }
    if (fence || /^\s*\|/.test(line)) return;
    const length = [...line].length;
    if (length > max) long.push(`${i + 1}: ${length}`);
  });
  return long;
}

describe('prose width', () => {
  it('covers every doc in docs/', () => {
    expect(files).toContain('docs/agentic-workflow.md');
    expect(files).toContain('docs/architecture.md');
  });

  it('ignores frontmatter, fences and tables but not prose', () => {
    const wide = 'x'.repeat(101);
    const sample = [
      '---',
      `description: ${wide}`,
      '---',
      '```sh',
      wide,
      '```',
      `| ${wide} |`,
      `  ${'„“'.repeat(49)}`,
      wide,
    ].join('\n');
    expect(longProseLines(sample)).toEqual(['9: 101']);
  });

  it.each(files)('%s: wraps prose at 100 characters', (file) => {
    expect(longProseLines(text(file))).toEqual([]);
  });
});
