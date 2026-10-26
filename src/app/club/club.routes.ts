import { Routes } from '@angular/router';

import { clubOwnerGuard } from '../login/club-owner.guard';

export const clubRoutes: Routes = [
  {
    path: 'club',
    loadComponent: () => import('./club-owner').then((m) => m.ClubOwner),
    canActivate: [clubOwnerGuard],
  },
];
