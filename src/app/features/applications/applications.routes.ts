import { Routes } from '@angular/router';

export const APPLICATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/applications/applications.page').then((m) => m.ApplicationsPage),
  },
];
