import { Routes } from '@angular/router';
import { guestGuard, tenantSelectionGuard } from '@core/guards/auth.guards';
import { ROUTE_SEGMENTS } from '@core/routing/app-paths';

/** Sign-in surfaces. Mounted at the app root: sibling apps and emails link to these exact paths. */
export const AUTH_ROUTES: Routes = [
  {
    path: ROUTE_SEGMENTS.login,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: ROUTE_SEGMENTS.register,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: ROUTE_SEGMENTS.forgotPassword,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: ROUTE_SEGMENTS.resetPassword,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: ROUTE_SEGMENTS.setPassword,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/set-password/set-password.page').then((m) => m.SetPasswordPage),
  },
  {
    path: ROUTE_SEGMENTS.selectCompany,
    canActivate: [tenantSelectionGuard],
    loadComponent: () =>
      import('./pages/select-company/select-company.page').then((m) => m.SelectCompanyPage),
  },
  {
    path: ROUTE_SEGMENTS.accessDenied,
    loadComponent: () =>
      import('./pages/access-denied/access-denied.page').then((m) => m.AccessDeniedPage),
  },
  {
    path: ROUTE_SEGMENTS.denied,
    loadComponent: () => import('./pages/denied/denied.page').then((m) => m.DeniedPage),
  },
  {
    path: ROUTE_SEGMENTS.sessionExpired,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/session-expired/session-expired.page').then((m) => m.SessionExpiredPage),
  },
];
