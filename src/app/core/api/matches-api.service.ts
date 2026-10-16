import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import {
  CreateMatchPayload,
  MatchListQuery,
  MatchResponse,
  MatchesIndexResponse,
} from './match.models';

@Injectable({
  providedIn: 'root',
})
export class MatchesApiService {
  private readonly http = inject(HttpClient);

  listMatches(query: MatchListQuery = {}): Observable<MatchesIndexResponse> {
    return this.http.get<MatchesIndexResponse>(apiV1Url('matches'), {
      params: this.toParams(query),
    });
  }

  listMyMatches(query: MatchListQuery = {}): Observable<MatchesIndexResponse> {
    return this.http.get<MatchesIndexResponse>(apiV1Url('me/matches'), {
      params: this.toParams(query),
    });
  }

  getMatch(id: number): Observable<MatchResponse> {
    return this.http.get<MatchResponse>(apiV1Url(`matches/${id}`));
  }

  createMatch(payload: CreateMatchPayload): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(apiV1Url('matches'), payload);
  }

  joinMatch(id: number, team?: string): Observable<MatchResponse> {
    const body = team ? { team } : {};
    return this.http.post<MatchResponse>(apiV1Url(`matches/${id}/join`), body);
  }

  leaveMatch(id: number): Observable<MatchResponse> {
    return this.http.delete<MatchResponse>(apiV1Url(`matches/${id}/leave`));
  }

  markPlayed(id: number): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(apiV1Url(`matches/${id}/played`), {});
  }

  private toParams(query: MatchListQuery): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
