import { expect, test, type Page } from '@playwright/test';

const ids = (page: Page) => ({
  input: page.getByTestId('cd-input'),
  output: page.getByTestId('cd-output'),
  count: page.getByTestId('cd-count'),
  custom: page.getByTestId('cd-custom'),
  status: page.getByTestId('cd-status'),
});

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Click a segment the way a user does (its visible label), then confirm the radio is selected. */
async function choose(page: Page, group: string, visibleText: string) {
  const segment = page
    .getByTestId(group)
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(visibleText)}\\s*$`) });
  await segment.click();
  await expect(segment.getByRole('radio')).toBeChecked();
}

test.describe('Column delimiter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/column-delimiter/');
  });

  test('joins pasted records live with the default comma', async ({ page }) => {
    const { input, output, count } = ids(page);
    await input.fill('1001\n1002\n\n  1003  ');
    await expect(output).toHaveValue('1001,1002,1003');
    await expect(count).toHaveText('3');
  });

  test('builds a quoted SQL IN list without duplicates', async ({ page }) => {
    const { input, output, count } = ids(page);
    await input.fill('A1\nB2\nA1');
    await choose(page, 'cd-quotes', 'Single');
    await choose(page, 'cd-dedupe', 'Yes');
    await expect(output).toHaveValue("'A1','B2'");
    await expect(count).toHaveText('2');
  });

  test('preset delimiters fill the custom field, and typing deselects them', async ({ page }) => {
    const { input, output, custom } = ids(page);
    await input.fill('a\nb');

    await choose(page, 'cd-delimiter', ';');
    await expect(custom).toHaveValue(';');
    await expect(output).toHaveValue('a;b');

    await choose(page, 'cd-delimiter', 'Tab');
    await expect(custom).toHaveValue('\\t');
    await expect(output).toHaveValue('a\tb');

    await custom.fill(' OR ');
    await expect(output).toHaveValue('a OR b');
    await expect(
      page.getByTestId('cd-delimiter').getByRole('radio', { checked: true }),
    ).toHaveCount(0);
  });

  test('puts one record per line when single line is off', async ({ page }) => {
    const { input, output } = ids(page);
    await input.fill('a\nb');
    await choose(page, 'cd-single-line', 'No');
    await expect(output).toHaveValue('a,\nb');
  });

  test('copies the result to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const { input, status } = ids(page);
    await input.fill('x\ny');
    await page.getByTestId('cd-copy').click();
    await expect(status).toHaveText('Copied to clipboard');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('x,y');
  });

  test('clear empties input, output and count', async ({ page }) => {
    const { input, output, count } = ids(page);
    await input.fill('a\nb');
    await page.getByTestId('cd-clear').click();
    await expect(input).toHaveValue('');
    await expect(output).toHaveValue('');
    await expect(count).toHaveText('0');
    await expect(input).toBeFocused();
  });

  test('controls work from the keyboard', async ({ page }) => {
    const { input, output } = ids(page);
    await input.fill('a\nb');
    await page.getByRole('radio', { name: 'Comma (,)' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Semicolon (;)' })).toBeChecked();
    await expect(output).toHaveValue('a;b');
  });

  test('works in Czech', async ({ page }) => {
    await page.goto('/cs/tools/column-delimiter/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oddělovač sloupce');
    await page.getByTestId('cd-input').fill('1\n2');
    await choose(page, 'cd-quotes', 'Dvojité');
    await expect(page.getByTestId('cd-output')).toHaveValue('"1","2"');
  });
});
