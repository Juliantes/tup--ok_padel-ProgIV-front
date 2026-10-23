import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  PADEL_API_BASE_URL,
  PadelHomeDashboard,
  PadelHomeNewsItem,
  PadelMatch,
  PadelPaginated,
  PadelPlayerRanking,
  PadelTournament,
} from './padel-api.models';

@Injectable({
  providedIn: 'root',
})
export class PadelApiService {
  private readonly http = inject(HttpClient);

  hasToken(): boolean {
    return Boolean(environment.padelApiToken?.trim());
  }

  loadHomeDashboard(): Observable<PadelHomeDashboard> {
    return forkJoin({
      tournaments: this.getTournamentsForSlider(),
      menRankings: this.getRankings('men'),
      womenRankings: this.getRankings('women'),
      recentMatches: this.getRecentMatches(),
    }).pipe(
      switchMap(({ tournaments, menRankings, womenRankings, recentMatches }) => {
        const featured = tournaments.slice(0, 3);
        if (featured.length === 0) {
          return of({
            slides: [],
            menRankings,
            womenRankings,
            recentMatches,
          });
        }

        const newsRequests = featured.map((tournament) =>
          this.getTournamentNews(tournament.id).pipe(catchError(() => of([]))),
        );

        return forkJoin(newsRequests).pipe(
          map((newsByTournament) => ({
            slides: featured.map((tournament, index) => ({
              tournament,
              news: newsByTournament[index] ?? [],
            })),
            menRankings,
            womenRankings,
            recentMatches,
          })),
        );
      }),
    );
  }

  formatMatchScore(score: PadelMatch['score']): string {
    if (!score || score === 'hidden_free_plan' || !Array.isArray(score) || score.length === 0) {
      return '';
    }

    return score.map((set) => `${set.team_1}-${set.team_2}`).join(', ');
  }

  isRankingVisible(
    ranking: PadelPlayerRanking,
  ): ranking is PadelPlayerRanking & { ranking: number; points: number } {
    return ranking.ranking !== 'hidden_free_plan' && ranking.points !== 'hidden_free_plan';
  }

  private getTournamentsForSlider(): Observable<PadelTournament[]> {
    return this.getPaginated<PadelTournament>('/tournaments', {
      status: 'live',
      per_page: '5',
      sort_by: 'start_date',
      order_by: 'desc',
    }).pipe(
      switchMap((live) => {
        const liveItems = live.data ?? [];
        if (liveItems.length >= 3) {
          return of(liveItems.slice(0, 5));
        }

        return this.getPaginated<PadelTournament>('/tournaments', {
          level: 'major,p1,p2',
          per_page: '8',
          sort_by: 'start_date',
          order_by: 'desc',
        }).pipe(map((recent) => this.mergeTournaments(liveItems, recent.data ?? []).slice(0, 5)));
      }),
    );
  }

  private getRankings(category: 'men' | 'women'): Observable<PadelPlayerRanking[]> {
    return this.getPaginated<PadelPlayerRanking>('/rankings', {
      type: 'official',
      category,
      per_page: '10',
      sort_by: 'ranking',
      order_by: 'asc',
    }).pipe(map((response) => response.data ?? []));
  }

  private getRecentMatches(): Observable<PadelMatch[]> {
    const afterDate = this.formatDateDaysAgo(14);

    return this.getPaginated<PadelMatch>('/matches', {
      after_date: afterDate,
      sort_by: 'played_at',
      order_by: 'desc',
      per_page: '8',
    }).pipe(map((response) => response.data ?? []));
  }

  private getTournamentNews(tournamentId: number): Observable<PadelHomeNewsItem[]> {
    return this.getPaginated<unknown>(`/tournaments/${tournamentId}/news`, {
      language: 'es',
      per_page: '5',
    }).pipe(
      map(
        (response) =>
          (response.data ?? []).map(normalizeNewsItem).filter(Boolean) as PadelHomeNewsItem[],
      ),
    );
  }

  private getPaginated<T>(
    path: string,
    query: Record<string, string>,
  ): Observable<PadelPaginated<T>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      params = params.set(key, value);
    }

    return this.http.get<PadelPaginated<T>>(`${PADEL_API_BASE_URL}${path}`, {
      params,
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): Record<string, string> {
    const token = environment.padelApiToken?.trim() ?? '';
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  private mergeTournaments(
    primary: PadelTournament[],
    secondary: PadelTournament[],
  ): PadelTournament[] {
    const seen = new Set<number>();
    const merged: PadelTournament[] = [];

    for (const tournament of [...primary, ...secondary]) {
      if (seen.has(tournament.id)) {
        continue;
      }
      seen.add(tournament.id);
      merged.push(tournament);
    }

    return merged;
  }

  private formatDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  }
}

function normalizeNewsItem(raw: unknown): PadelHomeNewsItem | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return { title: trimmed, url: trimmed };
    }

    return { title: trimmed, url: null };
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const title =
    pickString(record, 'title') ?? pickString(record, 'headline') ?? pickString(record, 'name');
  const url = pickString(record, 'url') ?? pickString(record, 'link');

  if (!title && !url) {
    return null;
  }

  return {
    title: title ?? url ?? 'Noticia',
    url,
  };
}

function pickString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
