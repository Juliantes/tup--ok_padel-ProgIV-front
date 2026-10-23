import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { ApiSessionService } from '../core/api/api-session.service';
import { CourtsApiService } from '../core/api/courts-api.service';
import { Court, Match } from '../core/api/match.models';
import { MatchesApiService } from '../core/api/matches-api.service';
import {
  DateFilterPreset,
  LEVEL_REQUIRED_OPTIONS,
  MatchSearchFilters,
  TimeOfDayFilter,
  canJoinMatch,
  filterMatches,
  isUserEnrolled,
  levelRequiredI18nKey,
  pickJoinTeam,
  playerInitials,
  rosterSlots,
} from './matches-search.utils';

@Component({
  selector: 'app-matches-list',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './matches-list.html',
  styleUrl: './matches-list.css',
})
export class MatchesList implements OnInit {
  private readonly matchesApi = inject(MatchesApiService);
  private readonly courtsApi = inject(CourtsApiService);
  private readonly apiSession = inject(ApiSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly matches = signal<Match[]>([]);
  protected readonly courtsById = signal<Record<number, Court>>({});
  protected readonly isMine = signal(false);
  protected readonly actionMatchId = signal<number | null>(null);

  protected readonly onlyOpenSpots = signal(false);
  protected readonly datePreset = signal<DateFilterPreset>('any');
  protected readonly pickedDate = signal<string | null>(null);
  protected readonly timeOfDay = signal<TimeOfDayFilter | null>(null);
  protected readonly category = signal<string | null>(null);

  protected readonly levelOptions = LEVEL_REQUIRED_OPTIONS;

  protected readonly filteredMatches = computed(() => {
    if (this.isMine()) {
      return this.matches();
    }

    const filters: MatchSearchFilters = {
      onlyOpenSpots: this.onlyOpenSpots(),
      datePreset: this.datePreset(),
      pickedDate: this.pickedDate(),
      timeOfDay: this.timeOfDay(),
      category: this.category(),
    };

    return filterMatches(this.matches(), filters);
  });

  protected readonly levelRequiredI18nKey = levelRequiredI18nKey;
  protected readonly playerInitials = playerInitials;
  protected readonly rosterSlots = rosterSlots;

  ngOnInit(): void {
    this.isMine.set(this.route.snapshot.data['mine'] === true);
    this.loadData();
  }

  protected loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const matches$ = this.isMine()
      ? this.matchesApi.listMyMatches({ per_page: 50 })
      : this.matchesApi.listMatches({ per_page: 50 });

    forkJoin({
      matches: matches$,
      courts: this.courtsApi.listCourts(),
    }).subscribe({
      next: ({ matches, courts }) => {
        const map: Record<number, Court> = {};
        for (const court of courts.courts) {
          map[court.id] = court;
        }

        this.courtsById.set(map);
        this.matches.set(matches.matches);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ERROR');
        this.isLoading.set(false);
      },
    });
  }

  protected courtFor(match: Match): Court | undefined {
    return this.courtsById()[match.court.id];
  }

  protected venueName(match: Match): string {
    const court = this.courtFor(match);
    if (court?.club.name) {
      return `${court.club.name} | ${court.name}`;
    }

    return match.court.name;
  }

  protected venueAddress(match: Match): string | null {
    return this.courtFor(match)?.club.address ?? null;
  }

  protected pricePerHour(match: Match): number | null {
    const price = this.courtFor(match)?.price_per_hour;
    return price !== undefined ? price : null;
  }

  protected setDatePreset(preset: DateFilterPreset): void {
    this.datePreset.set(preset);
    if (preset !== 'pick') {
      this.pickedDate.set(null);
    }
  }

  protected onPickedDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.pickedDate.set(value || null);
    if (value) {
      this.datePreset.set('pick');
    }
  }

  protected toggleTimeOfDay(slot: TimeOfDayFilter): void {
    this.timeOfDay.update((current) => (current === slot ? null : slot));
  }

  protected isEnrolled(match: Match): boolean {
    return isUserEnrolled(match, this.apiSession.user()?.id);
  }

  protected canJoin(match: Match): boolean {
    return canJoinMatch(match, this.apiSession.user()?.id);
  }

  protected showJoinButton(match: Match): boolean {
    return !this.isMine() && this.canJoin(match);
  }

  protected showDetailButton(match: Match): boolean {
    return this.isMine() || this.isEnrolled(match);
  }

  protected isFullForViewer(match: Match): boolean {
    return match.status === 'full' && !this.isEnrolled(match);
  }

  protected openDetail(match: Match): void {
    void this.router.navigate(['/matches', match.id]);
  }

  protected onCardClick(match: Match): void {
    this.openDetail(match);
  }

  protected onCardKeydown(event: KeyboardEvent, match: Match): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick(match);
    }
  }

  protected joinAndOpen(match: Match, event: Event): void {
    event.stopPropagation();

    if (!this.canJoin(match) || this.actionMatchId() !== null) {
      return;
    }

    this.actionMatchId.set(match.id);
    const team = pickJoinTeam(match);

    this.matchesApi.joinMatch(match.id, team).subscribe({
      next: () => {
        this.actionMatchId.set(null);
        void this.router.navigate(['/matches', match.id]);
      },
      error: () => {
        this.errorMessage.set('MATCHES.ACTION_ERROR');
        this.actionMatchId.set(null);
        this.loadData();
      },
    });
  }
}
