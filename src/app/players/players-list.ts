import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';

import { PlayerDetail, PlayerSummary } from '../core/api/player.models';
import { PlayersApiService } from '../core/api/players-api.service';
import { AuthService } from '../login/auth.service';
import { PlayerCard } from './player-card';

@Component({
  selector: 'app-players-list',
  imports: [MatProgressSpinnerModule, PlayerCard, TranslatePipe],
  templateUrl: './players-list.html',
  styleUrl: './players-list.css',
})
export class PlayersList implements OnInit {
  private readonly playersApi = inject(PlayersApiService);
  private readonly authService = inject(AuthService);

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly players = signal<PlayerSummary[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly expandedId = signal<number | null>(null);
  protected readonly detailsById = signal<Record<number, PlayerDetail>>({});
  protected readonly detailLoadingId = signal<number | null>(null);
  protected readonly detailErrors = signal<Record<number, string>>({});

  ngOnInit(): void {
    void this.authService.ensureRailsSession();
    this.loadPlayers();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.loadPlayers();
    }, 300);
  }

  protected isExpanded(playerId: number): boolean {
    return this.expandedId() === playerId;
  }

  protected detailFor(playerId: number): PlayerDetail | null {
    return this.detailsById()[playerId] ?? null;
  }

  protected detailErrorFor(playerId: number): string {
    return this.detailErrors()[playerId] ?? '';
  }

  protected toggleDetail(player: PlayerSummary): void {
    if (this.expandedId() === player.id) {
      this.expandedId.set(null);
      return;
    }

    this.expandedId.set(player.id);

    if (this.detailsById()[player.id]) {
      return;
    }

    this.detailLoadingId.set(player.id);
    this.detailErrors.update((errors) => {
      const next = { ...errors };
      delete next[player.id];
      return next;
    });

    this.playersApi.getPlayer(player.id).subscribe({
      next: (detail) => {
        this.detailsById.update((cache) => ({ ...cache, [player.id]: detail }));
        this.detailLoadingId.set(null);
      },
      error: (error) => {
        this.detailErrors.update((errors) => ({
          ...errors,
          [player.id]: this.resolveDetailError(error),
        }));
        this.detailLoadingId.set(null);
      },
    });
  }

  private loadPlayers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const q = this.searchTerm().trim();
    this.playersApi.listPlayers({ q: q || undefined, per_page: 50 }).subscribe({
      next: (response) => {
        this.players.set(response.players);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.resolveListError(error));
        this.isLoading.set(false);
      },
    });
  }

  private resolveListError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'PLAYERS.FORBIDDEN';
      }
      if (error.status === 401) {
        return 'PLAYERS.UNAUTHORIZED';
      }
    }

    return 'PLAYERS.ERROR';
  }

  private resolveDetailError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return 'PLAYERS.NOT_FOUND';
      }
    }

    return 'PLAYERS.ERROR_DETAIL';
  }
}
