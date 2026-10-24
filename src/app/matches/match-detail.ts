import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

import { Match, MatchResponse, MatchResultReport } from '../core/api/match.models';
import { MatchResultsApiService } from '../core/api/match-results-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { ApiSessionService } from '../core/api/api-session.service';
import {
  canJoinMatch,
  isUserEnrolled,
  pickJoinTeam,
  playerInitials,
  rosterSlots,
} from './matches-search.utils';

const STATUS_I18N_KEYS: Record<string, string> = {
  open: 'MATCHES.STATUS_OPEN',
  full: 'MATCHES.STATUS_FULL',
  confirmed: 'MATCHES.STATUS_CONFIRMED',
  completed: 'MATCHES.STATUS_COMPLETED',
  cancelled: 'MATCHES.STATUS_CANCELLED',
  reported: 'MATCHES.STATUS_REPORTED',
};

type RouteLoadState =
  | { kind: 'loading' }
  | { kind: 'error'; key: string }
  | { kind: 'ready'; match: Match };

@Component({
  selector: 'app-match-detail',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './match-detail.html',
  styleUrl: './match-detail.css',
})
export class MatchDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly resultsApi = inject(MatchResultsApiService);
  private readonly apiSession = inject(ApiSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  protected readonly playerInitials = playerInitials;
  protected readonly rosterSlots = rosterSlots;

  protected readonly matchId = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    { initialValue: 0 },
  );

  protected readonly routeState = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        if (!id) {
          return of<RouteLoadState>({ kind: 'error', key: 'MATCHES.ERROR' });
        }

        return this.matchesApi.getMatch(id).pipe(
          map((response) => ({
            kind: 'ready' as const,
            match: response.match,
          })),
          catchError(() => of<RouteLoadState>({ kind: 'error', key: 'MATCHES.ERROR' })),
          startWith({ kind: 'loading' as const }),
        );
      }),
    ),
    { initialValue: { kind: 'loading' } },
  );

  private readonly matchOverride = signal<Match | null>(null);
  private readonly resultsOverride = signal<MatchResultReport[] | null>(null);

  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal('');

  protected readonly isLoading = computed(() => this.routeState().kind === 'loading');

  protected readonly errorMessage = computed(() => {
    const state = this.routeState();
    return state.kind === 'error' ? state.key : '';
  });

  protected readonly match = computed(() => {
    const override = this.matchOverride();
    if (override) {
      return override;
    }

    const state = this.routeState();
    return state.kind === 'ready' ? state.match : null;
  });

  protected readonly results = computed(() => {
    const override = this.resultsOverride();
    if (override) {
      return override;
    }

    return this.match()?.match_results ?? [];
  });

  protected readonly showResultsSection = computed(() => {
    const current = this.match();
    if (!current) {
      return false;
    }

    const userId = this.apiSession.user()?.id;
    return this.results().length > 0 || isUserEnrolled(current, userId);
  });

  protected readonly joinForm = this.fb.group({
    team: ['team_a', Validators.required],
  });

  protected readonly resultForm = this.fb.group({
    set1A: [6, [Validators.required, Validators.min(0)]],
    set1B: [4, [Validators.required, Validators.min(0)]],
    set2A: [6, [Validators.required, Validators.min(0)]],
    set2B: [3, [Validators.required, Validators.min(0)]],
    team: ['team_a'],
  });

  constructor() {
    effect(() => {
      this.matchId();
      untracked(() => {
        this.matchOverride.set(null);
        this.resultsOverride.set(null);
        this.actionError.set('');
      });
    });

    effect(() => {
      const current = this.match();
      if (!current || current.roster_mode !== 'pairs') {
        return;
      }

      const suggested = pickJoinTeam(current);
      if (suggested) {
        untracked(() => this.joinForm.controls.team.setValue(suggested));
      }
    });
  }

  protected statusLabel(status: string): string {
    const key = STATUS_I18N_KEYS[status];
    return key ? this.translate.instant(key) : status;
  }

  protected categoryLabel(match: Match): string {
    return match.level_required_label ?? match.level_required;
  }

  protected matchTime(match: Match): string {
    if (match.time_slot?.start_time) {
      return match.time_slot.start_time;
    }

    const date = new Date(match.date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  protected locationLine(match: Match): string {
    const club = match.court.club;
    if (!club) {
      return match.court.name;
    }

    return `${club.name}, ${club.address}`;
  }

  protected organizerInitial(name: string): string {
    return playerInitials(name);
  }

  protected shareText(match: Match): string {
    const date = new Date(match.date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const time = this.matchTime(match);
    const location = this.locationLine(match);
    const url = window.location.href;
    return `${this.translate.instant('MATCHES.SHARE_LINE', {
      date,
      time,
      location,
      court: match.court.name,
      url,
    })}`;
  }

  protected shareViaWhatsApp(match: Match): void {
    const text = encodeURIComponent(this.shareText(match));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  protected async shareNative(match: Match): Promise<void> {
    const text = this.shareText(match);
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.translate.instant('MATCHES.DETAIL_TITLE'),
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or share failed; fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard unavailable.
    }
  }

  protected canJoin(match: Match): boolean {
    return canJoinMatch(match, this.apiSession.user()?.id);
  }

  protected isFullForViewer(match: Match): boolean {
    const userId = this.apiSession.user()?.id;
    return match.status === 'full' && !isUserEnrolled(match, userId);
  }

  protected join(): void {
    const current = this.match();
    if (!current) {
      return;
    }

    this.runAction(() => {
      const team =
        current.roster_mode === 'pairs'
          ? (this.joinForm.controls.team.value ?? undefined)
          : pickJoinTeam(current);
      return this.matchesApi.joinMatch(current.id, team);
    });
  }

  protected leave(): void {
    const current = this.match();
    if (!current) {
      return;
    }

    this.runAction(() => this.matchesApi.leaveMatch(current.id));
  }

  protected markPlayed(): void {
    const current = this.match();
    if (!current) {
      return;
    }

    this.runAction(() => this.matchesApi.markPlayed(current.id));
  }

  protected reportResult(): void {
    const current = this.match();
    if (!current || this.resultForm.invalid) {
      return;
    }

    this.runAction(() =>
      this.resultsApi.reportResult(current.id, {
        sets: [
          {
            team_a_games: this.resultForm.controls.set1A.value ?? 0,
            team_b_games: this.resultForm.controls.set1B.value ?? 0,
          },
          {
            team_a_games: this.resultForm.controls.set2A.value ?? 0,
            team_b_games: this.resultForm.controls.set2B.value ?? 0,
          },
        ],
      }),
    );
  }

  protected deleteResult(resultId: number): void {
    const current = this.match();
    if (!current) {
      return;
    }

    this.runAction(() => this.resultsApi.deleteResult(current.id, resultId));
  }

  protected isActivePlayer(): boolean {
    const current = this.match();
    const userId = this.apiSession.user()?.id;
    if (!current || !userId) {
      return false;
    }

    return isUserEnrolled(current, userId);
  }

  protected canDeleteResult(result: MatchResultReport): boolean {
    const userId = this.apiSession.user()?.id;
    return userId !== undefined && result.reported_by.id === userId;
  }

  private applyMatchResponse(response: MatchResponse): void {
    const updated = response.match;
    this.matchOverride.set(updated);
    this.resultsOverride.set(updated.match_results ?? []);
  }

  private runAction(action: () => Observable<MatchResponse>): void {
    this.actionLoading.set(true);
    this.actionError.set('');
    action().subscribe({
      next: (response) => {
        this.applyMatchResponse(response);
        this.actionLoading.set(false);
      },
      error: (error) => {
        this.actionError.set(this.extractActionError(error));
        this.actionLoading.set(false);
      },
    });
  }

  private extractActionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'object' && body !== null && 'error' in body) {
        const message = (body as { error: unknown }).error;
        if (typeof message === 'string' && message.length > 0) {
          return message;
        }
      }
    }

    return this.translate.instant('MATCHES.ACTION_ERROR');
  }
}
