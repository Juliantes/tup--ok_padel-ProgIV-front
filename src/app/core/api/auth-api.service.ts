import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { LoginResponse } from './api-user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);

  exchangeFirebaseToken(idToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(apiV1Url('oauth/google'), { id_token: idToken });
  }
}
