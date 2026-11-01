import { Routes } from '@angular/router';
import { authGuard, onboardingGuard } from '@core/guards/auth.guards';
import { AUTH_ROUTES } from '@features/auth/auth.routes';
import { ONBOARDING_ROUTES } from '@features/onboarding/onboarding.routes';

/**
 * Composition only: each feature owns its routes. Auth and onboarding mount at the root because
 * sibling apps, emails and the payment provider link to those exact paths.
 */
export const routes: Routes = [
  ...AUTH_ROUTES,
  ...ONBOARDING_ROUTES,
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@core/layout/shell/shell-layout').then((m) => m.ShellLayout),
    children: [
      {
        path: '',
        canActivate: [onboardingGuard],
        children: [
          // `/` and `/applications` both show the launcher.
          {
            path: '',
            pathMatch: 'full',
            loadChildren: () =>
              import('@features/applications/applications.routes').then((m) => m.APPLICATIONS_ROUTES),
          },
          {
            path: 'applications',
            loadChildren: () =>
              import('@features/applications/applications.routes').then((m) => m.APPLICATIONS_ROUTES),
          },
          {
            path: 'members',
            loadChildren: () =>
              import('@features/members/members.routes').then((m) => m.MEMBERS_ROUTES),
          },
          {
            path: 'roles',
            loadChildren: () => import('@features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
          },
          {
            path: 'teams',
            loadChildren: () => import('@features/teams/teams.routes').then((m) => m.TEAMS_ROUTES),
          },
          {
            path: 'my-access',
            loadChildren: () =>
              import('@features/my-access/my-access.routes').then((m) => m.MY_ACCESS_ROUTES),
          },
          {
            path: 'account',
            loadChildren: () =>
              import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
