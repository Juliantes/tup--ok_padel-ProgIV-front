import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map, switchMap } from 'rxjs';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.whenReady().pipe(
    switchMap(() => from(auth.ensureRailsSession())),
    map((ok) => (ok ? true : router.createUrlTree(['/login']))),
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.whenReady().pipe(
    switchMap(() => from(auth.ensureRailsSession())),
    map((ok) => (!ok ? true : router.createUrlTree(['/home']))),
  );
};
