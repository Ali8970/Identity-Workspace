import { expect, test } from '@playwright/test';
import { installApiMocks } from './api-mocks';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('brooch.lang', 'en');
    document.cookie = 'brooch.lang=en; path=/';
  });
  await installApiMocks(page, 'active');
});

test('role permissions use a readable label instead of the permission code', async ({ page }) => {
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Manage role Agent' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Permissions' }).click();
  await dialog.getByRole('button', { name: 'CRM' }).click();

  await expect(dialog.getByText('View contacts', { exact: true })).toBeVisible();
  await expect(dialog.getByText('crm.contacts.read')).toHaveCount(0);
});

test('my access lists readable permission labels', async ({ page }) => {
  await page.goto('/my-access');
  const main = page.locator('#main-content');

  await expect(main.getByRole('heading', { name: 'Memberships' })).toBeHidden();
  await main.getByText('Account', { exact: true }).click();
  await expect(main.getByRole('heading', { name: 'Memberships' })).toBeVisible();
  await expect(main.getByText('Read', { exact: true }).first()).toBeVisible();
  await expect(main.getByText('identity.memberships.read')).toHaveCount(0);
});

test('permission dictionary groups labels in accordions', async ({ page }) => {
  await page.goto('/permissions');
  const main = page.locator('#main-content');

  await expect(main.getByText('View members', { exact: true })).toBeHidden();
  await expect(main.getByText('Manage roles', { exact: true })).toBeHidden();

  await main.getByText('Memberships', { exact: true }).click();
  await expect(main.getByText('View members', { exact: true })).toBeVisible();

  await main.getByText('Roles', { exact: true }).click();
  await expect(main.getByText('Manage roles', { exact: true })).toBeVisible();

  await main.getByRole('searchbox', { name: 'Search permissions' }).fill('contacts');
  await expect(main.getByText('View contacts', { exact: true })).toBeVisible();
  await expect(main.getByText('View members', { exact: true })).toBeHidden();
});
