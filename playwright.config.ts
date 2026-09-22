import { defineConfig } from '@playwright/test';

/**
 * Visual baselines of the Account SPA. The dev server is plain HTTP on 127.0.0.1 so
 * screenshots do not depend on the dev.account.brooch.sa certificate. API calls are
 * fulfilled in the spec, never sent to staging.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 2,
  reporter: 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4310',
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'Asia/Riyadh',
  },
  webServer: {
    command: 'npx ng serve --host 127.0.0.1 --port 4310 --ssl false',
    url: 'http://127.0.0.1:4310',
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
