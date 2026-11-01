import { expect, test } from '@playwright/test';
import { installApiMocks } from './api-mocks';

/**
 * The list search box holds a draft: it only filters on Enter (or Apply), and Clear resets it.
 * Guards the ListFilterBar move from Reactive Forms to Signal Forms (audit NG-04).
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('brooch.lang', 'en');
    document.cookie = 'brooch.lang=en; path=/';
  });
  await installApiMocks(page, 'active');
});

test('members search applies on Enter, not while typing', async ({ page }) => {
  await page.goto('/members');
  const main = page.locator('#main-content');
  await expect(main.getByText('Sara Alqahtani')).toBeVisible();
  await expect(main.getByText('Layan Alhassan')).toBeVisible();

  const search = main.getByRole('searchbox');
  await search.fill('sara');
  await expect(main.getByText('Layan Alhassan')).toBeVisible();

  await search.press('Enter');
  await expect(main.getByText('Sara Alqahtani')).toBeVisible();
  await expect(main.getByText('Layan Alhassan')).toHaveCount(0);
});

test('roles search applies on Enter and keeps the typed draft', async ({ page }) => {
  await page.goto('/roles');
  const main = page.locator('#main-content');
  const search = main.getByRole('searchbox');
  await search.fill('zzz-no-such-role');
  await search.press('Enter');
  await expect(search).toHaveValue('zzz-no-such-role');
  await expect(main.locator('table tbody tr')).toHaveCount(0);
});
