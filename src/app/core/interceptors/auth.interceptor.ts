import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { apiV1Url } from '../api/api-base';
import { ApiSessionService } from '../api/api-session.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const OAUTH_URL = apiV1Url('oauth/google');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  if (req.url === OAUTH_URL) {
    let headers = req.headers.set('Accept', 'application/json');
    if (MUTATING_METHODS.has(req.method) && !req.headers.has('Content-Type')) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return next(req.clone({ headers }));
  }

  const apiSession = inject(ApiSessionService);
  const token = apiSession.token();

  let headers = req.headers.set('Accept', 'application/json');

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  if (MUTATING_METHODS.has(req.method) && !req.headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
  }

  return next(req.clone({ headers }));
};
