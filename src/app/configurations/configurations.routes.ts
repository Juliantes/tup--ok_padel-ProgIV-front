import { Routes } from '@angular/router';

export const configurationsRoutes: Routes = [
  {
    path: 'configurations',
    loadComponent: () => import('./configurations').then((m) => m.Configurations),
  },
  {
    path: 'configurations/account',
    loadComponent: () => import('./account/account').then((m) => m.Account),
  },
];
