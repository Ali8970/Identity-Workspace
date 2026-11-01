import { expect, Page, test } from '@playwright/test';
import { installApiMocks, SessionMode } from './api-mocks';
import {
  captureComputedStyles,
  expectNetworkBaseline,
  expectStyleBaseline,
  Lang,
  recordApiCalls,
  seedPreferences,
  settle,
  t,
  tPrefix,
} from './baseline-helpers';

/**
 * Interaction-state baselines: dialogs, menus and narrow layouts the first-paint route shots in
 * visual.spec.ts never reach. Each state is captured in light/en and dark/ar so LTR, RTL and
 * both themes are covered, and records the API calls the interaction makes.
 */

interface UiState {
  id: string;
  path: string;
  session: SessionMode;
  open: (page: Page, lang: Lang) => Promise<void>;
  width?: number;
}

async function openDialog(page: Page): Promise<void> {
  // Destructive confirms render as alertdialog.
  await expect(page.locator('[role=dialog], [role=alertdialog]').last()).toBeVisible();
  await expect(page.locator('.ui-skeleton')).toHaveCount(0);
  await expect(page.locator('.ui-loading-bar')).toHaveCount(0);
}

async function openFirstTeam(page: Page): Promise<void> {
  await page.locator('#main-content ul > li > button').first().click();
  await openDialog(page);
}

const states: UiState[] = [
  {
    id: 'members-invite',
    path: '/members',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'members.add') }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'members-detail',
    path: '/members',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'members.details'), exact: true }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'members-edit-roles',
    path: '/members',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: tPrefix(lang, 'members.editRolesFor') }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'members-remove-confirm',
    path: '/members',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: tPrefix(lang, 'members.removeFor') }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'roles-create',
    path: '/roles',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'roles.add') }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'roles-details',
    path: '/roles',
    session: 'active',
    open: async (page, lang) => {
      await page
        .getByRole('button', { name: new RegExp(`${t(lang, 'roles.manageRole')}|${t(lang, 'roles.viewRole')}`) })
        .first()
        .click();
      await openDialog(page);
    },
  },
  {
    id: 'teams-create',
    path: '/teams',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'teams.create') }).first().click();
      await openDialog(page);
    },
  },
  {
    id: 'teams-details',
    path: '/teams',
    session: 'active',
    open: async (page) => openFirstTeam(page),
  },
  {
    id: 'header-company-menu',
    path: '/applications',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'shell.companyMenu') }).first().click();
    },
  },
  {
    id: 'header-user-menu',
    path: '/applications',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'shell.userMenu') }).first().click();
    },
  },
  {
    id: 'sidebar-collapsed',
    path: '/members',
    session: 'active',
    open: async (page, lang) => {
      await page.getByRole('button', { name: t(lang, 'shell.closeSidebar') }).first().click();
    },
  },
  { id: 'mobile-applications', path: '/applications', session: 'active', width: 390, open: async () => undefined },
  { id: 'mobile-members', path: '/members', session: 'active', width: 390, open: async () => undefined },
  { id: 'mobile-login', path: '/login', session: 'anonymous', width: 390, open: async () => undefined },
  { id: 'mobile-onboarding-package', path: '/onboarding/package', session: 'onboarding', width: 390, open: async () => undefined },
];

const variants = [
  { theme: 'light', lang: 'en' },
  { theme: 'dark', lang: 'ar' },
] as const;

for (const state of states) {
  for (const { theme, lang } of variants) {
    const name = `${state.id}-${theme}-${lang}`;
    test(`state ${name}`, async ({ page }) => {
      await seedPreferences(page, theme, lang);
      await installApiMocks(page, state.session);
      const calls = recordApiCalls(page);
      await page.setViewportSize({ width: state.width ?? 1280, height: 800 });
      await page.goto(state.path);
      await settle(page);
      await state.open(page, lang);
      await page.mouse.move(0, 0);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [page.locator('.ui-loading-bar')],
      });
      expectNetworkBaseline(`state-${name}`, calls);
      expectStyleBaseline(`state-${name}`, await captureComputedStyles(page));
    });
  }
}
