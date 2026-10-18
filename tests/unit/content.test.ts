import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tools } from '@/data/tools';
import { en } from '@/i18n/en';
import { cs } from '@/i18n/cs';

const root = new URL('../../', import.meta.url);

describe('tool registry', () => {
  it.each(tools.map((tool) => [tool.slug, tool] as const))(
    '%s has text, pages, source and tests in both languages',
    (slug, tool) => {
      expect(en.tools[tool.key].title).toBeTruthy();
      expect(cs.tools[tool.key].title).toBeTruthy();
      expect(existsSync(new URL(`src/pages/tools/${slug}.astro`, root))).toBe(true);
      expect(existsSync(new URL(`src/pages/cs/tools/${slug}.astro`, root))).toBe(true);
      for (const file of [tool.source, ...tool.tests]) {
        expect(existsSync(new URL(file, root)), file).toBe(true);
      }
    },
  );

  it('has unique slugs', () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('case studies', () => {
  const list = (locale: string) =>
    readdirSync(new URL(`src/content/case-studies/${locale}/`, root)).sort();

  it('exist with the same slugs in English and Czech', () => {
    expect(list('en').length).toBeGreaterThan(0);
    expect(list('cs')).toEqual(list('en'));
  });
});
