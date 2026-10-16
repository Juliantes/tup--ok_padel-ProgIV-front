import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () => import('./users').then((m) => m.Users),
  },
];
