import { Routes } from '@angular/router';

export const playersRoutes: Routes = [
  {
    path: 'players',
    loadComponent: () => import('./players-list').then((m) => m.PlayersList),
  },
];
