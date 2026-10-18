import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/cs/',
  '/tools/',
  '/cs/tools/',
  '/tools/column-delimiter/',
  '/cs/tools/column-delimiter/',
  '/tools/char-counter/',
  '/cs/tools/char-counter/',
  '/how-it-was-built/',
  '/cs/how-it-was-built/',
];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Accessibility (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const path of pages) {
      test(`${path} has no axe violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
      });
    }
  });
}
