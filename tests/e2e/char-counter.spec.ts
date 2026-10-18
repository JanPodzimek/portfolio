import { expect, test } from '@playwright/test';

test.describe('Character counter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/char-counter/');
  });

  test('shows zeros before any input', async ({ page }) => {
    for (const stat of ['characters', 'charactersNoSpaces', 'words', 'lines', 'bytes']) {
      await expect(page.getByTestId(`cc-${stat}`)).toHaveText('0');
    }
  });

  test('counts typed text live', async ({ page }) => {
    await page.getByTestId('cc-input').fill('Hello world\nsecond line');
    await expect(page.getByTestId('cc-characters')).toHaveText('23');
    await expect(page.getByTestId('cc-charactersNoSpaces')).toHaveText('20');
    await expect(page.getByTestId('cc-words')).toHaveText('4');
    await expect(page.getByTestId('cc-lines')).toHaveText('2');
    await expect(page.getByTestId('cc-bytes')).toHaveText('23');
  });

  test('counts diacritics and emoji as single characters', async ({ page }) => {
    await page.getByTestId('cc-input').fill('kůň 👍🏽');
    await expect(page.getByTestId('cc-characters')).toHaveText('5');
    await expect(page.getByTestId('cc-bytes')).toHaveText('14');
  });

  test('clear resets all counters', async ({ page }) => {
    await page.getByTestId('cc-input').fill('abc');
    await page.getByTestId('cc-clear').click();
    await expect(page.getByTestId('cc-characters')).toHaveText('0');
    await expect(page.getByTestId('cc-input')).toBeFocused();
  });
});
