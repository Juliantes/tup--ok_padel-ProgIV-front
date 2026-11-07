import { Routes } from '@angular/router';

import { playerGuard } from '../login/player.guard';

export const courtsRoutes: Routes = [
  {
    path: 'courts',
    loadComponent: () => import('./player-courts').then((m) => m.PlayerCourts),
    canActivate: [playerGuard],
  },
];
