import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
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
import { Observable } from 'rxjs';

import { Match, MatchResponse, MatchResultReport } from '../core/api/match.models';
import { MatchResultsApiService } from '../core/api/match-results-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { ApiSessionService } from '../core/api/api-session.service';

const STATUS_I18N_KEYS: Record<string, string> = {
  open: 'MATCHES.STATUS_OPEN',
  full: 'MATCHES.STATUS_FULL',
  confirmed: 'MATCHES.STATUS_CONFIRMED',
  completed: 'MATCHES.STATUS_COMPLETED',
  cancelled: 'MATCHES.STATUS_CANCELLED',
  reported: 'MATCHES.STATUS_REPORTED',
};

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
export class MatchDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly resultsApi = inject(MatchResultsApiService);
  private readonly apiSession = inject(ApiSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  protected readonly isLoading = signal(true);
  protected readonly actionLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly match = signal<Match | null>(null);
  protected readonly results = signal<MatchResultReport[]>([]);

  protected readonly resultForm = this.fb.group({
    set1A: [6, [Validators.required, Validators.min(0)]],
    set1B: [4, [Validators.required, Validators.min(0)]],
    set2A: [6, [Validators.required, Validators.min(0)]],
    set2B: [3, [Validators.required, Validators.min(0)]],
    team: ['team_a'],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage.set('MATCHES.ERROR');
      this.isLoading.set(false);
      return;
    }

    this.loadMatch(id);
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
    return name.trim().charAt(0).toUpperCase();
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
    if (!this.apiSession.user()) {
      return false;
    }

    if (match.status !== 'open' && match.status !== 'full') {
      return false;
    }

    return !this.isActivePlayer();
  }

  protected loadMatch(id: number): void {
    this.isLoading.set(true);
    this.matchesApi.getMatch(id).subscribe({
      next: (response) => {
        this.match.set(response.match);
        this.isLoading.set(false);
        this.loadResults(id);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ERROR');
        this.isLoading.set(false);
      },
    });
  }

  protected join(): void {
    const current = this.match();
    if (!current) {
      return;
    }

    this.runAction(() => {
      const team =
        current.roster_mode === 'pairs'
          ? (this.resultForm.controls.team.value ?? undefined)
          : undefined;
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

    return current.match_players.some(
      (player) => player.user_id === userId && player.status !== 'cancelled',
    );
  }

  protected canDeleteResult(result: MatchResultReport): boolean {
    const userId = this.apiSession.user()?.id;
    return userId !== undefined && result.reported_by.id === userId;
  }

  private loadResults(matchId: number): void {
    this.resultsApi.listResults(matchId).subscribe({
      next: (response) => {
        this.results.set(response.results);
        const current = this.match();
        if (current) {
          this.match.set({ ...current, consensus: response.consensus });
        }
      },
      error: () => {
        this.results.set([]);
      },
    });
  }

  private runAction(action: () => Observable<MatchResponse>): void {
    this.actionLoading.set(true);
    action().subscribe({
      next: (response) => {
        this.match.set(response.match);
        this.actionLoading.set(false);
        this.loadResults(response.match.id);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ACTION_ERROR');
        this.actionLoading.set(false);
      },
    });
  }
}
