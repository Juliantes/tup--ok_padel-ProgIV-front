import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { PlayersApiService } from './players-api.service';

describe('PlayersApiService', () => {
  let service: PlayersApiService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/v1/players`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlayersApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlayersApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists players with optional search query', () => {
    service.listPlayers({ q: 'Ana', page: 1 }).subscribe();

    const req = http.expectOne((request) => request.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('Ana');
    expect(req.request.params.get('page')).toBe('1');

    req.flush({
      players: [],
      meta: { current_page: 1, per_page: 20, total_pages: 0, total_count: 0 },
    });
  });

  it('fetches player detail by id', () => {
    service.getPlayer(7).subscribe();

    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 7,
      name: 'Test',
      self_level: 5,
      category_label: '5ta',
      court_side: null,
      court_side_label: null,
      bio: null,
      wins: 0,
      losses: 0,
      played: 0,
      win_rate: '0.0',
      current_streak: 0,
      best_streak: 0,
      average_stars: null,
      reviews_count: 0,
      star_counts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      reviews: [],
    });
  });
});
