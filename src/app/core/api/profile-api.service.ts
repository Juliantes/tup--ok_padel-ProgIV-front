import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { ApiUser, UserResponse } from './api-user.model';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  self_level?: number;
  bio?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(apiV1Url('profile'));
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UserResponse> {
    return this.http.patch<UserResponse>(apiV1Url('profile'), payload);
  }
}

export type { ApiUser };
