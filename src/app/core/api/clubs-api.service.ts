import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import {
  OwnerClubPayload,
  OwnerClubResponse,
  OwnerClubsResponse,
  OwnerCourtPayload,
  OwnerCourtResponse,
  OwnerCourtsResponse,
} from './club.models';

@Injectable({
  providedIn: 'root',
})
export class ClubsApiService {
  private readonly http = inject(HttpClient);

  listClubs(): Observable<OwnerClubsResponse> {
    return this.http.get<OwnerClubsResponse>(apiV1Url('clubs'));
  }

  createClub(payload: OwnerClubPayload): Observable<OwnerClubResponse> {
    return this.http.post<OwnerClubResponse>(apiV1Url('clubs'), payload);
  }

  updateClub(id: number, payload: Partial<OwnerClubPayload>): Observable<OwnerClubResponse> {
    return this.http.patch<OwnerClubResponse>(apiV1Url(`clubs/${id}`), payload);
  }

  deleteClub(id: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`clubs/${id}`));
  }

  listCourts(clubId: number): Observable<OwnerCourtsResponse> {
    return this.http.get<OwnerCourtsResponse>(apiV1Url(`clubs/${clubId}/courts`));
  }

  createCourt(clubId: number, payload: OwnerCourtPayload): Observable<OwnerCourtResponse> {
    return this.http.post<OwnerCourtResponse>(apiV1Url(`clubs/${clubId}/courts`), payload);
  }

  updateCourt(
    clubId: number,
    courtId: number,
    payload: Partial<OwnerCourtPayload>,
  ): Observable<OwnerCourtResponse> {
    return this.http.patch<OwnerCourtResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}`),
      payload,
    );
  }

  deleteCourt(clubId: number, courtId: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`clubs/${clubId}/courts/${courtId}`));
  }
}
