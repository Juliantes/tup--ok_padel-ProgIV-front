import { Routes } from '@angular/router';
import { configurationsRoutes } from './configurations/configurations.routes';
import { authGuard, guestGuard } from './login/auth.guard';
import { clubRoutes } from './club/club.routes';
import { courtsRoutes } from './courts/courts.routes';
import { matchesRoutes } from './matches/matches.routes';
import { playersRoutes } from './players/players.routes';

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
      ...playersRoutes,
      ...clubRoutes,
      ...courtsRoutes,
      ...configurationsRoutes,
    ],
  },
];
