import { Routes } from '@angular/router';
import { configurationsRoutes } from './configurations/configurations.routes';
import { authGuard, guestGuard } from './login/auth.guard';
import { matchesRoutes } from './matches/matches.routes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./home/home').then((m) => m.Home),
      },
      ...matchesRoutes,
      ...configurationsRoutes,
    ],
  },
];
