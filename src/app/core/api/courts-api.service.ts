import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { CourtResponse, CourtsResponse } from './match.models';

@Injectable({
  providedIn: 'root',
})
export class CourtsApiService {
  private readonly http = inject(HttpClient);

  listCourts(): Observable<CourtsResponse> {
    return this.http.get<CourtsResponse>(apiV1Url('courts'));
  }

  getCourt(id: number): Observable<CourtResponse> {
    return this.http.get<CourtResponse>(apiV1Url(`courts/${id}`));
  }
}
