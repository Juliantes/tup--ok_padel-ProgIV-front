import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import { PlayerDetail, PlayersIndexResponse, PlayersListQuery } from './player.models';

@Injectable({
  providedIn: 'root',
})
export class PlayersApiService {
  private readonly http = inject(HttpClient);

  listPlayers(query: PlayersListQuery = {}): Observable<PlayersIndexResponse> {
    let params = new HttpParams();
    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.per_page != null) {
      params = params.set('per_page', String(query.per_page));
    }
    return this.http.get<PlayersIndexResponse>(apiV1Url('players'), { params });
  }

  getPlayer(id: number): Observable<PlayerDetail> {
    return this.http.get<PlayerDetail>(apiV1Url(`players/${id}`));
  }
}
