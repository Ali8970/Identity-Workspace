import { Routes } from '@angular/router';
import {
  authGuard,
  guestGuard,
  onboardingCompleteGuard,
  onboardingGuard,
  tenantSelectionGuard,
} from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'set-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/set-password/set-password.page').then((m) => m.SetPasswordPage),
  },
  {
    path: 'select-company',
    canActivate: [tenantSelectionGuard],
    loadComponent: () =>
      import('./features/select-company/select-company.page').then((m) => m.SelectCompanyPage),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied.page').then((m) => m.AccessDeniedPage),
  },
  {
    path: 'denied',
    loadComponent: () => import('./features/denied/denied.page').then((m) => m.DeniedPage),
  },
  {
    path: 'mock-target/:app',
    loadComponent: () =>
      import('./features/mock-target/mock-target.page').then((m) => m.MockTargetPage),
  },
  {
    path: 'session-expired',
    loadComponent: () =>
      import('./features/session-expired/session-expired.page').then((m) => m.SessionExpiredPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/shell-layout').then((m) => m.ShellLayout),
    children: [
      {
        path: 'onboarding/company',
        canActivate: [onboardingCompleteGuard],
        loadComponent: () =>
          import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
      },
      {
        path: 'onboarding/package',
        canActivate: [onboardingCompleteGuard],
        loadComponent: () =>
          import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
      },
      {
        path: '',
        canActivate: [onboardingGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/applications/applications.page').then((m) => m.ApplicationsPage),
          },
          {
            path: 'applications',
            loadComponent: () =>
              import('./features/applications/applications.page').then((m) => m.ApplicationsPage),
          },
          {
            path: 'members',
            loadComponent: () =>
              import('./features/members/members.page').then((m) => m.MembersPage),
          },
          {
            path: 'roles',
            loadComponent: () => import('./features/roles/roles.page').then((m) => m.RolesPage),
          },
          {
            path: 'permissions',
            loadComponent: () =>
              import('./features/permissions/permissions.page').then((m) => m.PermissionsPage),
          },
          {
            path: 'teams',
            loadComponent: () => import('./features/teams/teams.page').then((m) => m.TeamsPage),
          },
          {
            path: 'my-access',
            loadComponent: () =>
              import('./features/my-access/my-access.page').then((m) => m.MyAccessPage),
          },
          {
            path: 'account',
            loadComponent: () =>
              import('./features/account/account.page').then((m) => m.AccountPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
