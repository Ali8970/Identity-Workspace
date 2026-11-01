import { Routes } from '@angular/router';
import { guestGuard, tenantSelectionGuard } from '@core/guards/auth.guards';

/** Sign-in surfaces. Mounted at the app root: sibling apps and emails link to these exact paths. */
export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'set-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/set-password/set-password.page').then((m) => m.SetPasswordPage),
  },
  {
    path: 'select-company',
    canActivate: [tenantSelectionGuard],
    loadComponent: () =>
      import('./pages/select-company/select-company.page').then((m) => m.SelectCompanyPage),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./pages/access-denied/access-denied.page').then((m) => m.AccessDeniedPage),
  },
  {
    path: 'denied',
    loadComponent: () => import('./pages/denied/denied.page').then((m) => m.DeniedPage),
  },
  {
    path: 'session-expired',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/session-expired/session-expired.page').then((m) => m.SessionExpiredPage),
  },
];
