import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { PadelPlayer } from '../models/padel-player.model';
import { PlayersApiService } from './players-api.service';
import { PlayersStorageService } from './players-storage.service';

@Injectable({
  providedIn: 'root',
})
export class PlayersStateService {
  private readonly apiService = inject(PlayersApiService);
  private readonly storageService = inject(PlayersStorageService);

  getPlayers(): Observable<PadelPlayer[]> {
    return this.refreshPlayers();
  }

  refreshPlayers(): Observable<PadelPlayer[]> {
    this.storageService.clearPlayers();

    return this.apiService
      .fetchPlayers()
      .pipe(tap((players) => this.storageService.savePlayers(players)));
  }
}
