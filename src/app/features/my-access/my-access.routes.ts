import { Routes } from '@angular/router';

export const MY_ACCESS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/my-access/my-access.page').then((m) => m.MyAccessPage),
  },
];
