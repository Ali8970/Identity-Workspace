import { Routes } from '@angular/router';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
];
