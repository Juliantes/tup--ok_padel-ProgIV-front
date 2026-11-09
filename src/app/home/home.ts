import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AnalyticsService } from '../analytics/analytics.service';
import { todayIsoDate } from '../club/club-schedule.utils';
import { ApiSessionService } from '../core/api/api-session.service';
import { CourtBookingsApiService } from '../core/api/court-bookings-api.service';
import { CourtsApiService } from '../core/api/courts-api.service';
import { PlayerAvailabilityResponse } from '../core/api/club.models';
import { Court, Match } from '../core/api/match.models';
import { MatchesApiService } from '../core/api/matches-api.service';
import { UserAccountService } from '../configurations/services/user-account.service';
import {
  HomeTimeWindow,
  RecommendedMatchCard,
  buildAvailableCourtCards,
  buildRecommendedMatches,
  categoryForSelfLevel,
  collectCitiesFromCourts,
  estimatedSlotPrice,
  extractCityFromAddress,
  levelOptionsForSelect,
} from './home-discovery.utils';
import {
  canJoinMatch,
  levelRequiredI18nKey,
  pickJoinTeam,
  playerInitials,
  rosterSlots,
} from '../matches/matches-search.utils';

export type HomeLayoutVariant = 'A' | 'B' | 'C';

@Component({
  selector: 'app-home',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly analytics = inject(AnalyticsService);
  private readonly courtsApi = inject(CourtsApiService);
  private readonly courtBookingsApi = inject(CourtBookingsApiService);
  private readonly matchesApi = inject(MatchesApiService);
  private readonly apiSession = inject(ApiSessionService);
  private readonly userAccount = inject(UserAccountService);
  private readonly router = inject(Router);

  protected readonly layoutVariant = signal<HomeLayoutVariant>('A');
  protected readonly activeTab = signal<'courts' | 'matches'>('courts');
  protected readonly masterSlide = signal(0);

  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);

  protected readonly cityOptions = signal<string[]>([]);
  protected readonly selectedCity = signal('all');
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly selectedTimeWindow = signal<HomeTimeWindow>('now');
  protected readonly selectedLevel = signal<string | null>(null);

  protected readonly availabilityRaw = signal<PlayerAvailabilityResponse[]>([]);
  protected readonly matchesRaw = signal<Match[]>([]);
  protected readonly courtsByIdMap = signal<Map<number, Court>>(new Map());
  protected readonly clubCount = signal(0);

  protected readonly actionMatchId = signal<number | null>(null);

  protected readonly courtsTrack = viewChild<ElementRef<HTMLElement>>('courtsTrack');
  protected readonly matchesTrack = viewChild<ElementRef<HTMLElement>>('matchesTrack');

  protected readonly levelOptions = levelOptionsForSelect();

  protected readonly userCategory = computed(() => {
    const user = this.apiSession.user();
    return categoryForSelfLevel(user?.self_level ?? null);
  });

  protected readonly userSideLabel = computed(() => {
    const user = this.apiSession.user();
    return user?.court_side_label ?? user?.court_side ?? null;
  });

  protected readonly discoveryFilters = computed(() => ({
    city: this.selectedCity(),
    dateIso: this.selectedDate(),
    timeWindow: this.selectedTimeWindow(),
    levelCategory: this.selectedLevel(),
    now: new Date(),
  }));

  protected readonly courtSlots = computed(() =>
    buildAvailableCourtCards(this.availabilityRaw(), this.discoveryFilters(), this.courtsByIdMap()),
  );

  protected readonly recommendedMatches = computed(() => {
    const user = this.apiSession.user();
    return buildRecommendedMatches(
      this.matchesRaw(),
      this.discoveryFilters(),
      user?.id,
      user?.self_level ?? null,
      user?.court_side ?? null,
    );
  });

  protected readonly stats = computed(() => ({
    slots: this.courtSlots().length,
    clubs: this.clubCount(),
    openMatches: this.recommendedMatches().length,
  }));

  protected readonly levelRequiredI18nKey = levelRequiredI18nKey;
  protected readonly playerInitials = playerInitials;
  protected readonly rosterSlots = rosterSlots;
  protected readonly estimatedSlotPrice = estimatedSlotPrice;

  ngOnInit(): void {
    this.initFiltersFromProfile();
    void this.loadDiscoveryData();
  }

  protected trackHomeClick(section: string): void {
    this.analytics.trackButtonClick(section, 'home');
  }

  protected applySearch(): void {
    this.trackHomeClick('buscar');
    void this.loadDiscoveryData();
  }

  protected onCityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCity.set(value || 'all');
  }

  protected onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.selectedDate.set(value);
      void this.loadDiscoveryData();
    }
  }

  protected onTimeWindowChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as HomeTimeWindow;
    this.selectedTimeWindow.set(value);
  }

  protected onLevelChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedLevel.set(value || null);
  }

  protected setActiveTab(tab: 'courts' | 'matches'): void {
    this.activeTab.set(tab);
  }

  protected setMasterSlide(index: number): void {
    this.masterSlide.set(index);
  }

  protected scrollSlice(which: 'courts' | 'matches', direction: -1 | 1): void {
    const el =
      which === 'courts' ? this.courtsTrack()?.nativeElement : this.matchesTrack()?.nativeElement;
    if (!el) {
      return;
    }
    const card = el.querySelector<HTMLElement>('.home-card');
    const step = card ? card.offsetWidth + 16 : 280;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  protected goToCourts(): void {
    this.trackHomeClick('explorar_clubes');
    void this.router.navigate(['/courts']);
  }

  protected goToCourtSlot(): void {
    this.trackHomeClick('turno_cancha');
    void this.router.navigate(['/courts']);
  }

  protected goToMatchesList(): void {
    this.trackHomeClick('ver_partidos');
    const query: Record<string, string> = {};
    if (this.selectedDate()) {
      query['date'] = this.selectedDate();
    }
    if (this.selectedTimeWindow() !== 'now') {
      query['timeOfDay'] = this.selectedTimeWindow();
    }
    if (this.selectedLevel()) {
      query['category'] = this.selectedLevel()!;
    }
    query['openSpots'] = '1';
    void this.router.navigate(['/matches'], { queryParams: query });
  }

  protected openMatch(id: number): void {
    void this.router.navigate(['/matches', id]);
  }

  protected canJoin(card: RecommendedMatchCard): boolean {
    return canJoinMatch(card.match, this.apiSession.user()?.id);
  }

  protected joinMatch(card: RecommendedMatchCard, event: Event): void {
    event.stopPropagation();
    const match = card.match;
    if (!this.canJoin(card) || this.actionMatchId() !== null) {
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
        this.actionMatchId.set(null);
        void this.loadDiscoveryData();
      },
    });
  }

  private initFiltersFromProfile(): void {
    const user = this.apiSession.user();
    const category = categoryForSelfLevel(user?.self_level ?? null);
    if (category) {
      this.selectedLevel.set(category);
    }

    if (!user?.id) {
      return;
    }

    const details = this.userAccount.getAccountDetails(String(user.id));
    const city = extractCityFromAddress(details.address);
    if (city) {
      this.selectedCity.set(city);
    }
  }

  private async loadDiscoveryData(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(false);

    const dateIso = this.selectedDate();

    try {
      const courtsResponse = await firstValueFrom(this.courtsApi.listCourts());

      const courts = courtsResponse.courts;
      const courtsById = new Map(courts.map((court) => [court.id, court]));
      this.courtsByIdMap.set(courtsById);
      const cities = collectCitiesFromCourts(courts);
      this.cityOptions.set(cities);

      const clubIds = [...new Set(courts.map((c) => c.club.id))];
      this.clubCount.set(clubIds.length);

      const availabilityRequests = clubIds.map((clubId) =>
        this.courtBookingsApi.getClubAvailability(clubId, dateIso).pipe(catchError(() => of(null))),
      );

      const [availabilityResults, matchesResponse] = await Promise.all([
        firstValueFrom(forkJoin(availabilityRequests)),
        firstValueFrom(this.matchesApi.listMatches({ per_page: 50 })),
      ]);

      const availability = availabilityResults.filter(
        (row): row is NonNullable<typeof row> => row !== null,
      );

      this.availabilityRaw.set(availability);
      this.matchesRaw.set(matchesResponse.matches);
    } catch {
      this.loadError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }
}
