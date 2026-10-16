import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../login/auth.service';
import { CreatePadelPlayer, PadelPlayer } from './models/padel-player.model';
import { PlayersApiService } from './services/players-api.service';
import { PlayersStateService } from './services/players-state.service';

type SortField = 'name' | 'age';

@Component({
  selector: 'app-users',
  imports: [TranslatePipe],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users implements OnInit {
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly sortField = signal<SortField | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly players = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    let result = [...this.allPlayers()];

    if (term) {
      result = result.filter((player) => this.matchesSearch(player, term));
    }

    const field = this.sortField();
    if (field) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        if (field === 'name') {
          return a.fullName.localeCompare(b.fullName, 'es') * direction;
        }

        return (a.age - b.age) * direction;
      });
    }

    return result;
  });

  private readonly allPlayers = signal<PadelPlayer[]>([]);
  private readonly authService = inject(AuthService);
  private readonly playersApiService = inject(PlayersApiService);
  private readonly playersStateService = inject(PlayersStateService);
  private readonly translate = inject(TranslateService);

  protected readonly isAdmin = this.authService.isAdmin;

  ngOnInit(): void {
    void this.authService.refreshUserRole();
    this.loadPlayers();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected toggleSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortField.set(field);
    this.sortDirection.set('asc');
  }

  protected isSortActive(field: SortField): boolean {
    return this.sortField() === field;
  }

  protected sortIndicator(field: SortField): string {
    if (this.sortField() !== field) {
      return '';
    }

    return this.sortDirection() === 'asc' ? ' ↑' : ' ↓';
  }

  protected createSamplePlayer(): void {
    const samplePlayer: CreatePadelPlayer = {
      fullName: 'Nuevo Jugador',
      image: 'https://randomuser.me/api/portraits/lego/1.jpg',
      email: `player-${Date.now()}@padelmatch.test`,
      age: 28,
      phone: '11-5555-0000',
      country: 'Argentina',
      state: 'Buenos Aires',
      city: 'CABA',
      active: true,
    };

    this.playersApiService.createPlayer(samplePlayer).subscribe({
      next: () => this.loadPlayers(true),
      error: (error) => this.handleActionError(error),
    });
  }

  protected deletePlayer(player: PadelPlayer): void {
    this.playersApiService.deletePlayer(player.id).subscribe({
      next: () => this.loadPlayers(true),
      error: (error) => this.handleActionError(error),
    });
  }

  private loadPlayers(forceRefresh = false): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request$ = forceRefresh
      ? this.playersStateService.refreshPlayers()
      : this.playersStateService.getPlayers();

    request$.subscribe({
      next: (players) => {
        this.allPlayers.set(players);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.resolveErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  private handleActionError(error: unknown): void {
    this.errorMessage.set(this.resolveErrorMessage(error));
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return this.translate.instant('USERS.FORBIDDEN');
      }

      if (error.status === 401) {
        return this.translate.instant('USERS.UNAUTHORIZED');
      }
    }

    return this.translate.instant('USERS.ERROR');
  }

  private matchesSearch(player: PadelPlayer, term: string): boolean {
    const searchableText = [
      player.fullName,
      player.email,
      String(player.age),
      player.country,
      player.state,
      player.city,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(term);
  }
}
