import { Routes } from '@angular/router';

export const TEAMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/teams/teams.page').then((m) => m.TeamsPage),
  },
];
