import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { MatchResponse, MatchResultsIndexResponse, ReportMatchResultPayload } from './match.models';

@Injectable({
  providedIn: 'root',
})
export class MatchResultsApiService {
  private readonly http = inject(HttpClient);

  listResults(matchId: number): Observable<MatchResultsIndexResponse> {
    return this.http.get<MatchResultsIndexResponse>(apiV1Url(`matches/${matchId}/match_results`));
  }

  reportResult(matchId: number, payload: ReportMatchResultPayload): Observable<MatchResponse> {
    return this.http.post<MatchResponse>(apiV1Url(`matches/${matchId}/match_results`), payload);
  }

  deleteResult(matchId: number, resultId: number): Observable<MatchResponse> {
    return this.http.delete<MatchResponse>(
      apiV1Url(`matches/${matchId}/match_results/${resultId}`),
    );
  }
}
