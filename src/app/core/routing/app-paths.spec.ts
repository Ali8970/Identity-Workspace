import { APP_PATHS, ROUTE_SEGMENTS } from './app-paths';

describe('APP_PATHS', () => {
  it('keeps the contract paths other apps, emails and the payment provider link to', () => {
    expect(APP_PATHS.login).toBe('/login');
    expect(APP_PATHS.selectCompany).toBe('/select-company');
    expect(APP_PATHS.accessDenied).toBe('/access-denied');
    expect(APP_PATHS.paymentReturn).toBe('/onboarding/payment-return');
    expect(APP_PATHS.paymentProcessing).toBe('/onboarding/payment-processing');
    expect(APP_PATHS.paymentDone).toBe('/onboarding/payment-done');
    expect(APP_PATHS.paymentFailed).toBe('/onboarding/payment-failed');
    expect(APP_PATHS.home).toBe('/');
  });

  it('derives every absolute path from its segment', () => {
    for (const [key, segment] of Object.entries(ROUTE_SEGMENTS)) {
      expect(APP_PATHS[key as keyof typeof ROUTE_SEGMENTS]).toBe(`/${segment}`);
    }
  });
});
