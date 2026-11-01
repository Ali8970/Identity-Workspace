/**
 * Every route the app navigates to, in one place, so a rename is a compile error rather than a
 * silent dead link. Sibling apps, emails and the payment provider also link to some of these
 * (`/login`, `/select-company`, `/access-denied`, `/onboarding/payment-*`): changing one is a
 * contract change, not a refactor.
 *
 * `src/index.html` keeps its own copy of the auth paths for the pre-boot shell (it runs before
 * Angular and cannot import this file).
 */
export const ROUTE_SEGMENTS = {
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
  resetPassword: 'reset-password',
  setPassword: 'set-password',
  selectCompany: 'select-company',
  sessionExpired: 'session-expired',
  accessDenied: 'access-denied',
  denied: 'denied',
  applications: 'applications',
  members: 'members',
  roles: 'roles',
  teams: 'teams',
  myAccess: 'my-access',
  account: 'account',
  onboardingCompany: 'onboarding/company',
  onboardingPackage: 'onboarding/package',
  onboardingPayment: 'onboarding/payment',
  paymentReturn: 'onboarding/payment-return',
  paymentProcessing: 'onboarding/payment-processing',
  paymentDone: 'onboarding/payment-done',
  paymentFailed: 'onboarding/payment-failed',
} as const;

type Segments = typeof ROUTE_SEGMENTS;

export const APP_PATHS = {
  home: '/',
  ...(Object.fromEntries(
    Object.entries(ROUTE_SEGMENTS).map(([key, segment]) => [key, `/${segment}`]),
  ) as { [K in keyof Segments]: `/${Segments[K]}` }),
} as const;
