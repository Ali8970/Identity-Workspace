import { Routes } from '@angular/router';
import { authGuard, onboardingCompleteGuard } from '@core/guards/auth.guards';

const loadOnboardingPage = () =>
  import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage);

/** The purchase wizard and its payment results. Mounted at the app root under `onboarding/`. */
export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'onboarding/company',
    canActivate: [authGuard, onboardingCompleteGuard],
    data: { step: 'company' },
    loadComponent: loadOnboardingPage,
  },
  {
    path: 'onboarding/package',
    canActivate: [authGuard, onboardingCompleteGuard],
    data: { step: 'package' },
    loadComponent: loadOnboardingPage,
  },
  {
    // The card step of a paid purchase. Still behind onboardingCompleteGuard: nothing has been
    // charged yet, so a tenant that already subscribed has no business here.
    path: 'onboarding/payment',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () => import('./pages/payment/payment.page').then((m) => m.PaymentPage),
  },
  // Payment results — the four paths the backend builds its callbacks against. Deliberately
  // OUTSIDE onboardingCompleteGuard: a verified payment flips the tenant to active, and that
  // guard would bounce the payer away from their own result.
  ...['payment-return', 'payment-processing', 'payment-done', 'payment-failed'].map((path) => ({
    path: `onboarding/${path}`,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/payment-result/payment-result.page').then((m) => m.PaymentResultPage),
  })),
];
