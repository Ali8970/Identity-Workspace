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
    loadComponent: () =>
      import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: 'set-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/set-password/set-password.page').then(
        (m) => m.SetPasswordPage,
      ),
  },
  {
    path: 'select-company',
    canActivate: [tenantSelectionGuard],
    loadComponent: () =>
      import('./features/auth/pages/select-company/select-company.page').then(
        (m) => m.SelectCompanyPage,
      ),
  },
  {
    path: 'onboarding/company',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding/onboarding.page').then(
        (m) => m.OnboardingPage,
      ),
  },
  {
    path: 'onboarding/package',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () =>
      import('./features/onboarding/pages/onboarding/onboarding.page').then(
        (m) => m.OnboardingPage,
      ),
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/auth/pages/access-denied/access-denied.page').then(
        (m) => m.AccessDeniedPage,
      ),
  },
  {
    path: 'denied',
    loadComponent: () =>
      import('./features/auth/pages/denied/denied.page').then((m) => m.DeniedPage),
  },
  {
    path: 'mock-target/:app',
    loadComponent: () =>
      import('./features/mock-target/pages/mock-target/mock-target.page').then(
        (m) => m.MockTargetPage,
      ),
  },
  {
    path: 'session-expired',
    loadComponent: () =>
      import('./features/auth/pages/session-expired/session-expired.page').then(
        (m) => m.SessionExpiredPage,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/shell-layout').then((m) => m.ShellLayout),
    children: [
      {
        path: '',
        canActivate: [onboardingGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/workspace/pages/applications/applications.page').then(
                (m) => m.ApplicationsPage,
              ),
          },
          {
            path: 'applications',
            loadComponent: () =>
              import('./features/workspace/pages/applications/applications.page').then(
                (m) => m.ApplicationsPage,
              ),
          },
          {
            path: 'members',
            loadComponent: () =>
              import('./features/workspace/pages/members/members.page').then(
                (m) => m.MembersPage,
              ),
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/workspace/pages/roles/roles.page').then((m) => m.RolesPage),
          },
          {
            path: 'permissions',
            loadComponent: () =>
              import('./features/workspace/pages/permissions/permissions.page').then(
                (m) => m.PermissionsPage,
              ),
          },
          {
            path: 'teams',
            loadComponent: () =>
              import('./features/workspace/pages/teams/teams.page').then((m) => m.TeamsPage),
          },
          {
            path: 'my-access',
            loadComponent: () =>
              import('./features/workspace/pages/my-access/my-access.page').then(
                (m) => m.MyAccessPage,
              ),
          },
          {
            path: 'account',
            loadComponent: () =>
              import('./features/workspace/pages/account/account.page').then(
                (m) => m.AccountPage,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
