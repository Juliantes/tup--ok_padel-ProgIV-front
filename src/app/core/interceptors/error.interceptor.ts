import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSessionService } from '../api/api-session.service';
import { AuthService } from '../../login/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const router = inject(Router);
  const authService = inject(AuthService);
  const apiSession = inject(ApiSessionService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const code =
        typeof error.error === 'object' && error.error && 'error' in error.error
          ? String((error.error as { error: string }).error)
          : '';

      if (code === 'token_expired' || code === 'token_invalid') {
        return from(authService.refreshRailsSession()).pipe(
          switchMap((refreshed) => {
            if (!refreshed) {
              apiSession.clear();
              if (!router.url.startsWith('/login')) {
                void router.navigateByUrl('/login');
              }
              return throwError(() => error);
            }

            const token = apiSession.token();
            if (!token) {
              return throwError(() => error);
            }

            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${token}` },
            });
            return next(retryReq);
          }),
        );
      }

      if (!router.url.startsWith('/login')) {
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};
