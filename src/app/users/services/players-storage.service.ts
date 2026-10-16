import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { PadelPlayer } from '../models/padel-player.model';

interface CachedPlayersPayload {
  data: PadelPlayer[];
  fetchedAt: number;
}

const STORAGE_KEY = 'padel-match-players-cache';
const CACHE_TTL_MS = 30 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class PlayersStorageService {
  private readonly platformId = inject(PLATFORM_ID);

  getPlayers(): PadelPlayer[] | null {
    const payload = this.readPayload();
    if (!payload || this.isExpired(payload.fetchedAt)) {
      this.clearPlayers();
      return null;
    }

    return payload.data;
  }

  savePlayers(players: PadelPlayer[]): void {
    if (!this.canUseStorage()) {
      return;
    }

    const payload: CachedPlayersPayload = {
      data: players,
      fetchedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  clearPlayers(): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }

  private readPayload(): CachedPlayersPayload | null {
    if (!this.canUseStorage()) {
      return null;
    }

    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as CachedPlayersPayload;
      if (!Array.isArray(parsed.data) || typeof parsed.fetchedAt !== 'number') {
        this.clearPlayers();
        return null;
      }

      return parsed;
    } catch {
      this.clearPlayers();
      return null;
    }
  }

  private isExpired(fetchedAt: number): boolean {
    return Date.now() - fetchedAt > CACHE_TTL_MS;
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }
}
