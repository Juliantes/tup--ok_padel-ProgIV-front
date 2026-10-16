import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreatePadelPlayer, PadelPlayer } from '../models/padel-player.model';

@Injectable({
  providedIn: 'root',
})
export class PlayersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  fetchPlayers(): Observable<PadelPlayer[]> {
    return this.http.get<PadelPlayer[]>(this.baseUrl);
  }

  createPlayer(player: CreatePadelPlayer): Observable<PadelPlayer> {
    return this.http.post<PadelPlayer>(this.baseUrl, player);
  }

  deletePlayer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
