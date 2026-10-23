import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { PADEL_API_BASE_URL } from './padel-api.models';
import { PadelApiService } from './padel-api.service';

describe('PadelApiService', () => {
  let service: PadelApiService;
  let httpMock: HttpTestingController;
  const originalToken = environment.padelApiToken;

  beforeEach(() => {
    environment.padelApiToken = 'test-token';

    TestBed.configureTestingModule({
      providers: [PadelApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(PadelApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.padelApiToken = originalToken;
    httpMock.verify();
  });

  it('loads home dashboard with bearer auth on padelapi.org', () => {
    service.loadHomeDashboard().subscribe((dashboard) => {
      expect(dashboard.slides.length).toBe(1);
      expect(dashboard.menRankings.length).toBe(1);
      expect(dashboard.recentMatches.length).toBe(1);
      expect(dashboard.slides[0].news[0].url).toBe('https://example.com/noticia');
    });

    const liveReq = httpMock.expectOne(
      (req) =>
        req.url === `${PADEL_API_BASE_URL}/tournaments` &&
        req.params.get('status') === 'live' &&
        req.headers.get('Authorization') === 'Bearer test-token',
    );
    liveReq.flush({ data: [{ id: 10, name: 'Live Open' }] });

    const menReq = httpMock.expectOne(
      (req) => req.url === `${PADEL_API_BASE_URL}/rankings` && req.params.get('category') === 'men',
    );
    menReq.flush({ data: [{ id: 1, name: 'Player A', ranking: 1, points: 100 }] });

    const womenReq = httpMock.expectOne(
      (req) =>
        req.url === `${PADEL_API_BASE_URL}/rankings` && req.params.get('category') === 'women',
    );
    womenReq.flush({ data: [{ id: 2, name: 'Player B', ranking: 1, points: 90 }] });

    const matchesReq = httpMock.expectOne(
      (req) => req.url === `${PADEL_API_BASE_URL}/matches` && req.params.has('after_date'),
    );
    matchesReq.flush({
      data: [
        {
          id: 99,
          name: 'A/B - C/D',
          round_name: 'Final',
          status: 'finished',
          score: [{ team_1: '6', team_2: '4' }],
        },
      ],
    });

    const recentReq = httpMock.expectOne(
      (req) =>
        req.url === `${PADEL_API_BASE_URL}/tournaments` &&
        req.params.get('level') === 'major,p1,p2',
    );
    recentReq.flush({ data: [] });

    const newsReq = httpMock.expectOne(
      (req) => req.url === `${PADEL_API_BASE_URL}/tournaments/10/news`,
    );
    expect(newsReq.request.params.get('language')).toBe('es');
    newsReq.flush({ data: ['https://example.com/noticia'] });
  });

  it('formats match scores', () => {
    expect(
      service.formatMatchScore([
        { team_1: '6', team_2: '4' },
        { team_1: '3', team_2: '6' },
      ]),
    ).toBe('6-4, 3-6');
    expect(service.formatMatchScore('hidden_free_plan')).toBe('');
  });
});
