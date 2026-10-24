import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ApiSessionService } from '../core/api/api-session.service';
import { Match } from '../core/api/match.models';
import { MatchesApiService } from '../core/api/matches-api.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { MatchDetail } from './match-detail';

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 4,
    date: '2026-10-24T20:30:00.000-03:00',
    duration: 90,
    status: 'open',
    roster_mode: 'pairs',
    level_required: 'fifth',
    level_required_label: '5ta',
    join_policy: 'auto',
    court: {
      id: 1,
      name: 'Cancha 2',
      club_id: 1,
      price_per_hour: 12000,
      club: { id: 1, name: 'Ok Padel Club', address: 'Av. Siempre Viva 742' },
    },
    creator: { id: 10, name: 'Organizador Test' },
    match_players: [
      {
        id: 1,
        user_id: 10,
        team: 'team_a',
        status: 'confirmed',
        joined_at: '2026-10-20T12:00:00.000-03:00',
        user: { id: 10, name: 'Organizador Test' },
      },
    ],
    players_count: 1,
    max_players: 4,
    time_slot: {
      id: 1,
      day_of_week: 5,
      start_time: '20:30',
      end_time: '22:00',
      is_available: true,
    },
    match_results: [],
    consensus: null,
    ...overrides,
  };
}

beforeAll(() => {
  registerLocaleData(localeEsAr);
});

describe('MatchDetail', () => {
  let fixture: ComponentFixture<MatchDetail>;
  let matchesApi: { getMatch: ReturnType<typeof vi.fn>; joinMatch: ReturnType<typeof vi.fn> };
  let apiSession: { user: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    matchesApi = {
      getMatch: vi.fn(() => of({ match: buildMatch() })),
      joinMatch: vi.fn(() =>
        of({
          match: buildMatch({
            players_count: 2,
            match_players: [
              ...buildMatch().match_players,
              {
                id: 2,
                user_id: 99,
                team: 'team_a',
                status: 'confirmed',
                joined_at: '2026-10-21T12:00:00.000-03:00',
                user: { id: 99, name: 'Visitante' },
              },
            ],
          }),
        }),
      ),
    };

    apiSession = {
      user: vi.fn(() => ({ id: 99, name: 'Visitante', email: 'v@test.com', roles: ['player'] })),
    };

    await TestBed.configureTestingModule({
      imports: [MatchDetail],
      providers: [
        provideRouter([{ path: 'matches/:id', component: MatchDetail }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...provideTranslateTesting(),
        { provide: LOCALE_ID, useValue: 'es-AR' },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '4' })) },
        },
        { provide: MatchesApiService, useValue: matchesApi },
        { provide: ApiSessionService, useValue: apiSession },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchDetail);
  });

  it('shows join CTA for a visitor with open spots', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const joinButton = fixture.nativeElement.querySelector('.match-cta-block .cta-button');
    expect(joinButton).toBeTruthy();
    expect(joinButton?.hasAttribute('disabled')).toBe(false);
  });

  it('hides join CTA when the viewer is already enrolled', async () => {
    apiSession.user.mockReturnValue({ id: 10, name: 'Organizador Test', roles: ['player'] });

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const joinCta = fixture.nativeElement.querySelector(
      '.match-cta-block .cta-button:not(.cta-button--secondary)',
    );
    expect(joinCta).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('MATCHES.LEAVE');
  });

  it('calls joinMatch with team in pairs mode', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as MatchDetail & {
      joinForm: MatchDetail['joinForm'];
      join: () => void;
    };
    component.joinForm.controls.team.setValue('team_b');
    component.join();

    expect(matchesApi.joinMatch).toHaveBeenCalledWith(4, 'team_b');
  });
});
