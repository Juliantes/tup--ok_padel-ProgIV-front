import { Routes } from '@angular/router';

export const matchesRoutes: Routes = [
  {
    path: 'matches',
    loadComponent: () => import('./matches-list').then((m) => m.MatchesList),
  },
  {
    path: 'matches/mine',
    loadComponent: () => import('./matches-list').then((m) => m.MatchesList),
    data: { mine: true },
  },
  {
    path: 'matches/new',
    loadComponent: () => import('./match-create').then((m) => m.MatchCreate),
  },
  {
    path: 'matches/:id',
    loadComponent: () => import('./match-detail').then((m) => m.MatchDetail),
  },
];
