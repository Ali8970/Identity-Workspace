import { expect, test } from '@playwright/test';
import { installApiMocks, SessionMode } from './api-mocks';

interface ShotRoute {
  id: string;
  path: string;
  session: SessionMode;
}

const routes: ShotRoute[] = [
  { id: 'login', path: '/login', session: 'anonymous' },
  { id: 'register', path: '/register', session: 'anonymous' },
  { id: 'forgot-password', path: '/forgot-password', session: 'anonymous' },
  { id: 'reset-password', path: '/reset-password?userId=user-1&token=token-1', session: 'anonymous' },
  { id: 'set-password', path: '/set-password?userId=user-1&code=1234', session: 'anonymous' },
  { id: 'session-expired', path: '/session-expired', session: 'anonymous' },
  { id: 'access-denied', path: '/access-denied', session: 'anonymous' },
  { id: 'denied', path: '/denied', session: 'anonymous' },
  { id: 'select-company', path: '/select-company', session: 'selection' },
  { id: 'onboarding-company', path: '/onboarding/company', session: 'onboarding' },
  { id: 'onboarding-package', path: '/onboarding/package', session: 'onboarding' },
  { id: 'payment', path: '/onboarding/payment?operationId=op-pay', session: 'onboarding' },
  { id: 'payment-return', path: '/onboarding/payment-return?operationId=op-return', session: 'onboarding' },
  { id: 'payment-processing', path: '/onboarding/payment-processing?operationId=op-processing', session: 'onboarding' },
  { id: 'payment-done', path: '/onboarding/payment-done?operationId=op-done', session: 'onboarding' },
  { id: 'payment-failed', path: '/onboarding/payment-failed?operationId=op-failed', session: 'onboarding' },
  { id: 'applications', path: '/applications', session: 'active' },
  { id: 'members', path: '/members', session: 'active' },
  { id: 'roles', path: '/roles', session: 'active' },
  { id: 'permissions', path: '/permissions', session: 'active' },
  { id: 'teams', path: '/teams', session: 'active' },
  { id: 'my-access', path: '/my-access', session: 'active' },
  { id: 'account', path: '/account', session: 'active' },
];

const themes = ['light', 'dark'] as const;
const languages = ['en', 'ar'] as const;

interface ViewportShot {
  name: string;
  width: number;
  height: number;
  /** Narrow shots cover the 920px shell/auth breakpoint. Light English is enough there. */
  themes: readonly ('light' | 'dark')[];
  languages: readonly ('en' | 'ar')[];
}

const viewports: ViewportShot[] = [
  { name: 'desktop', width: 1280, height: 800, themes, languages },
  { name: 'narrow', width: 900, height: 800, themes: ['light'], languages: ['en'] },
];

for (const route of routes) {
  for (const viewport of viewports) {
    for (const theme of viewport.themes) {
      for (const lang of viewport.languages) {
        test(`${route.id} ${theme} ${lang} ${viewport.name}`, async ({ page }) => {
          await page.clock.install({ time: new Date('2026-09-22T12:00:00Z') });
          await page.addInitScript(
            ({ theme: nextTheme, lang: nextLang }) => {
              localStorage.setItem('brooch.theme', nextTheme);
              localStorage.setItem('brooch.lang', nextLang);
              document.cookie = `brooch.theme=${nextTheme}; path=/`;
              document.cookie = `brooch.lang=${nextLang}; path=/`;
            },
            { theme, lang },
          );
          await installApiMocks(page, route.session);
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(route.path);
          await expect(page.locator('#main-content-header, h1').first()).toBeVisible();
          await expect(page.locator('.ui-skeleton')).toHaveCount(0);
          await expect(page.locator('.ui-loading-bar')).toHaveCount(0);
          await expect(page).toHaveScreenshot(
            `${route.id}-${theme}-${lang}-${viewport.name}.png`,
            {
              fullPage: true,
              animations: 'disabled',
              mask: [page.locator('.ui-loading-bar')],
            },
          );
        });
      }
    }
  }
}
