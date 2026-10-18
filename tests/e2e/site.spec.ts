import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test('presents the name, role and all main sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jan Podzimek/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jan Podzimek');
    for (const id of ['about', 'experience', 'work', 'how-i-test', 'tools', 'skills', 'contact']) {
      await expect(page.locator(`section#${id}`)).toBeAttached();
    }
    await expect(page.getByTestId('case-study')).toHaveCount(3);
  });

  test('offers a CV that actually downloads', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.getByTestId('cv-download').getAttribute('href');
    const response = await request.get(href!);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('pdf');
  });

  test('links to working certificate PDFs', async ({ page, request }) => {
    await page.goto('/');
    const links = page.locator('#credentials a[href$=".pdf"]');
    await expect(links).toHaveCount(2);
    for (const href of await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')))) {
      expect((await request.get(href!)).ok(), href!).toBe(true);
    }
  });

  test('has a working contact email', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('contact-email')).toHaveAttribute(
      'href',
      'mailto:podzimek.jan@seznam.cz',
    );
  });

  test('tool cards lead to the tools', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('tool-card-column-delimiter').click();
    await expect(page).toHaveURL(/\/tools\/column-delimiter\/$/);
  });
});

test.describe('Languages', () => {
  test('switches between English and Czech on the same page', async ({ page }) => {
    await page.goto('/tools/char-counter/');
    await page.getByTestId('lang-switch').click();
    await expect(page).toHaveURL(/\/cs\/tools\/char-counter\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Počítadlo znaků');

    await page.getByTestId('lang-switch').click();
    await expect(page).toHaveURL(/\/tools\/char-counter\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('declares alternate languages for search engines', async ({ page }) => {
    await page.goto('/cs/');
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      /\/$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="cs"]')).toHaveAttribute(
      'href',
      /\/cs\/$/,
    );
  });
});

test.describe('Theme', () => {
  test('follows the OS preference by default', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await context.close();
  });

  test('toggle switches the theme and remembers it across pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByTestId('theme-toggle').click();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/tools/');
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe('Other pages', () => {
  test('"How this site was built" is reachable from the footer', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'How this site was built' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How this site was built');
  });

  test('unknown URLs show the 404 page', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });

  test('a skip link lets keyboard users jump to the content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});
