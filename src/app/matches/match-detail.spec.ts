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
import { AuthService } from '../login/auth.service';
import { Match } from '../core/api/match.models';
import { MatchResultsApiService } from '../core/api/match-results-api.service';
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

function fullRosterMatch(overrides: Partial<Match> = {}): Match {
  return buildMatch({
    players_count: 4,
    status: 'confirmed',
    match_players: [
      {
        id: 1,
        user_id: 10,
        team: 'team_a',
        status: 'confirmed',
        joined_at: '2026-10-20T12:00:00.000-03:00',
        user: { id: 10, name: 'Organizador Test' },
      },
      {
        id: 2,
        user_id: 11,
        team: 'team_a',
        status: 'confirmed',
        joined_at: '2026-10-20T12:00:00.000-03:00',
        user: { id: 11, name: 'Compañero A' },
      },
      {
        id: 3,
        user_id: 12,
        team: 'team_b',
        status: 'confirmed',
        joined_at: '2026-10-20T12:00:00.000-03:00',
        user: { id: 12, name: 'Rival 1' },
      },
      {
        id: 4,
        user_id: 13,
        team: 'team_b',
        status: 'confirmed',
        joined_at: '2026-10-20T12:00:00.000-03:00',
        user: { id: 13, name: 'Rival 2' },
      },
    ],
    ...overrides,
  });
}

describe('MatchDetail', () => {
  let fixture: ComponentFixture<MatchDetail>;
  let matchesApi: { getMatch: ReturnType<typeof vi.fn>; joinMatch: ReturnType<typeof vi.fn> };
  let apiSession: { user: ReturnType<typeof vi.fn> };
  let resultsApi: {
    reportResult: ReturnType<typeof vi.fn>;
    deleteResult: ReturnType<typeof vi.fn>;
  };
  let isAdminUser = false;

  beforeEach(async () => {
    isAdminUser = false;
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
        {
          provide: MatchResultsApiService,
          useValue: (resultsApi = {
            reportResult: vi.fn(() => of({ match: buildMatch() })),
            deleteResult: vi.fn(),
          }),
        },
        { provide: ApiSessionService, useValue: apiSession },
        { provide: AuthService, useValue: { isAdmin: () => isAdminUser } },
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

  it('renders scoreboard with pair separation and no team_a labels', async () => {
    apiSession.user.mockReturnValue({ id: 10, name: 'Organizador Test', roles: ['player'] });
    matchesApi.getMatch = vi.fn(() =>
      of({
        match: buildMatch({
          players_count: 4,
          match_players: [
            {
              id: 1,
              user_id: 10,
              team: 'team_a',
              status: 'confirmed',
              joined_at: '2026-10-20T12:00:00.000-03:00',
              user: { id: 10, name: 'Pedro Meléndez' },
            },
            {
              id: 2,
              user_id: 11,
              team: 'team_a',
              status: 'confirmed',
              joined_at: '2026-10-20T12:00:00.000-03:00',
              user: { id: 11, name: 'Cándido Alfaro' },
            },
            {
              id: 3,
              user_id: 12,
              team: 'team_b',
              status: 'confirmed',
              joined_at: '2026-10-20T12:00:00.000-03:00',
              user: { id: 12, name: 'Daniel Bressel' },
            },
            {
              id: 4,
              user_id: 13,
              team: 'team_b',
              status: 'confirmed',
              joined_at: '2026-10-20T12:00:00.000-03:00',
              user: { id: 13, name: 'Pablo Castillo' },
            },
          ],
          consensus: {
            votes: 3,
            total: 4,
            signature: 'sig',
            sets: [
              { team_a_games: 6, team_b_games: 4 },
              { team_a_games: 6, team_b_games: 3 },
            ],
          },
        }),
      }),
    );

    fixture = TestBed.createComponent(MatchDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.scoreboard-panel')).toBeTruthy();
    expect(root.querySelector('.scoreboard-divider')).toBeTruthy();
    expect(root.textContent).toContain('Pedro Meléndez');
    expect(root.textContent).toContain('Pablo Castillo');
    expect(root.textContent).not.toContain('team_a');
    expect(root.textContent).not.toContain('team_b');
    expect(root.textContent).toContain('MATCHES.PAIR_1');
    expect(root.querySelectorAll('.scoreboard-score--winner').length).toBeGreaterThan(0);
  });

  it('renders result stepper starting at 0 with set 3 disabled', async () => {
    apiSession.user.mockReturnValue({ id: 10, name: 'Organizador Test', roles: ['player'] });
    matchesApi.getMatch = vi.fn(() => of({ match: fullRosterMatch() }));

    fixture = TestBed.createComponent(MatchDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const disabledSet = root.querySelector('.report-set-block--disabled');
    expect(disabledSet).toBeTruthy();
    expect(root.querySelectorAll('.report-set-card').length).toBe(3);
    expect(root.querySelector('.result-submit-btn')?.hasAttribute('disabled')).toBe(true);

    const component = fixture.componentInstance as MatchDetail & {
      displayReportSetGame: (setNumber: number, pair: 'a' | 'b') => string;
    };
    expect(component.displayReportSetGame(1, 'a')).toBe('0');
    expect(component.displayReportSetGame(3, 'a')).toBe('MATCHES.PLAYER_SLOT_EMPTY');
  });

  it('enables set 3 on 1-1 and posts two or three sets', async () => {
    apiSession.user.mockReturnValue({ id: 10, name: 'Organizador Test', roles: ['player'] });
    matchesApi.getMatch = vi.fn(() => of({ match: fullRosterMatch() }));

    fixture = TestBed.createComponent(MatchDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as MatchDetail & {
      adjustReportSetGame: (setNumber: number, pair: 'a' | 'b', delta: number) => void;
      canSubmitReport: () => boolean;
      reportResult: () => void;
    };

    for (let i = 0; i < 6; i += 1) {
      component.adjustReportSetGame(1, 'a', 1);
    }
    for (let i = 0; i < 4; i += 1) {
      component.adjustReportSetGame(1, 'b', 1);
    }
    for (let i = 0; i < 6; i += 1) {
      component.adjustReportSetGame(2, 'a', 1);
    }
    for (let i = 0; i < 3; i += 1) {
      component.adjustReportSetGame(2, 'b', 1);
    }

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-set-block--disabled')).toBeTruthy();
    expect(component.canSubmitReport()).toBe(true);

    component.reportResult();
    expect(resultsApi.reportResult).toHaveBeenCalledWith(4, {
      sets: [
        { team_a_games: 6, team_b_games: 4 },
        { team_a_games: 6, team_b_games: 3 },
      ],
    });

    component.adjustReportSetGame(2, 'a', -3);
    for (let i = 0; i < 3; i += 1) {
      component.adjustReportSetGame(2, 'b', 1);
    }
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-set-block--disabled')).toBeNull();
    fixture.detectChanges();
    expect(component.canSubmitReport()).toBe(false);

    for (let i = 0; i < 6; i += 1) {
      component.adjustReportSetGame(3, 'a', 1);
    }
    for (let i = 0; i < 2; i += 1) {
      component.adjustReportSetGame(3, 'b', 1);
    }
    fixture.detectChanges();
    expect(component.canSubmitReport()).toBe(true);

    component.reportResult();
    expect(resultsApi.reportResult).toHaveBeenLastCalledWith(4, {
      sets: [
        { team_a_games: 6, team_b_games: 4 },
        { team_a_games: 3, team_b_games: 6 },
        { team_a_games: 6, team_b_games: 2 },
      ],
    });
  });

  describe('canDeleteResult', () => {
    it('allows admin to delete any result on a completed match', async () => {
      isAdminUser = true;
      fixture = TestBed.createComponent(MatchDetail);
      fixture.detectChanges();
      await fixture.whenStable();

      const harness = fixture.componentInstance as MatchDetail & {
        canDeleteResult: (result: { reported_by: { id: number } }) => boolean;
      };

      matchesApi.getMatch = vi.fn(() =>
        of({
          match: buildMatch({ status: 'completed' }),
        }),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        harness.canDeleteResult({
          reported_by: { id: 999 },
        } as never),
      ).toBe(true);
    });

    it('blocks non-admin reporters on completed matches', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      const harness = fixture.componentInstance as MatchDetail & {
        canDeleteResult: (result: { reported_by: { id: number } }) => boolean;
      };

      matchesApi.getMatch = vi.fn(() =>
        of({
          match: buildMatch({ status: 'completed' }),
        }),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      apiSession.user.mockReturnValue({ id: 10, name: 'Organizador Test', roles: ['player'] });
      expect(
        harness.canDeleteResult({
          reported_by: { id: 10 },
        } as never),
      ).toBe(false);
    });
  });
});
