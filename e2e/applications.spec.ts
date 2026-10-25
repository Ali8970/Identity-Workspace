import { expect, test } from '@playwright/test';
import { installApiMocks } from './api-mocks';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('brooch.lang', 'en');
    document.cookie = 'brooch.lang=en; path=/';
  });
  await installApiMocks(page, 'active');
});

test('catalogue apps returned by the backend are openable and the rest stay locked', async ({
  page,
}) => {
  await page.goto('/applications');
  const main = page.locator('#main-content');

  await expect(main.getByRole('heading', { name: 'Your apps in one place' })).toBeVisible();
  await expect(main.getByRole('listitem')).toHaveCount(6);

  await expect(main.getByRole('link', { name: 'Open app' })).toHaveCount(3);
  await expect(main.getByRole('link', { name: 'Open app' }).nth(0)).toHaveAttribute(
    'href',
    'https://landlord.brooch.example',
  );
  await expect(main.getByRole('link', { name: 'Open app' }).nth(1)).toHaveAttribute(
    'href',
    'https://crm.brooch.example',
  );
  await expect(main.getByRole('link', { name: 'Open app' }).nth(2)).toHaveAttribute(
    'href',
    'https://listing.brooch.example',
  );
  await expect(main.getByRole('link', { name: 'Open app' }).nth(0)).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );

  await expect(main.getByText('This app is not available for your account yet')).toHaveCount(3);
  await expect(main.getByRole('heading', { name: 'Investment and returns' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Account' })).toHaveCount(0);
});
