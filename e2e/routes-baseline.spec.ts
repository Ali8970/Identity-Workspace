import { test } from '@playwright/test';
import { installApiMocks, SessionMode } from './api-mocks';
import {
  captureComputedStyles,
  expectNetworkBaseline,
  expectStyleBaseline,
  recordApiCalls,
  seedPreferences,
  settle,
} from './baseline-helpers';

/**
 * Per-route network and computed-style baselines. visual.spec.ts owns the pixels; this spec proves
 * the same requests are made and every element keeps its computed style.
 */

const routes: { id: string; path: string; session: SessionMode }[] = [
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
  { id: 'root', path: '/', session: 'active' },
  { id: 'applications', path: '/applications', session: 'active' },
  { id: 'members', path: '/members', session: 'active' },
  { id: 'roles', path: '/roles', session: 'active' },
  { id: 'teams', path: '/teams', session: 'active' },
  { id: 'my-access', path: '/my-access', session: 'active' },
  { id: 'account', path: '/account', session: 'active' },
];

const variants = [
  { theme: 'light', lang: 'en' },
  { theme: 'dark', lang: 'ar' },
] as const;

for (const route of routes) {
  test(`network ${route.id}`, async ({ page }) => {
    await seedPreferences(page, 'light', 'en');
    await installApiMocks(page, route.session);
    const calls = recordApiCalls(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(route.path);
    await settle(page);
    expectNetworkBaseline(`route-${route.id}`, calls);
  });

  for (const { theme, lang } of variants) {
    test(`styles ${route.id} ${theme} ${lang}`, async ({ page }) => {
      await seedPreferences(page, theme, lang);
      await installApiMocks(page, route.session);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route.path);
      await settle(page);
      expectStyleBaseline(`route-${route.id}-${theme}-${lang}`, await captureComputedStyles(page));
    });
  }
}
