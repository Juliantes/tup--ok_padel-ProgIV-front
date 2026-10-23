import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ApiSessionService } from '../core/api/api-session.service';
import { CourtsApiService } from '../core/api/courts-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { MatchCreate } from './match-create';
import { buildCreateMatchPayload, CreateWizardStep } from './match-create.utils';

type MatchCreateHarness = MatchCreate & {
  form: MatchCreate['form'];
  continue: (step: CreateWizardStep) => void;
  submit: () => void;
};

describe('MatchCreate', () => {
  let component: MatchCreateHarness;
  let fixture: ComponentFixture<MatchCreate>;
  let createMatchSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    createMatchSpy = vi.fn().mockReturnValue(
      of({
        match: {
          id: 42,
          date: '2026-10-22T19:00:00.000Z',
          duration: 90,
          status: 'open',
          roster_mode: 'individual',
          level_required: 'fifth',
          join_policy: 'auto',
          court: { id: 1, name: 'Cancha 1', club_id: 1 },
          creator: { id: 1, name: 'Tester' },
          match_players: [],
          players_count: 1,
          max_players: 4,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [MatchCreate],
      providers: [
        provideRouter([{ path: 'matches/:id', component: MatchCreate }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...provideTranslateTesting(),
        {
          provide: CourtsApiService,
          useValue: {
            listCourts: () =>
              of({
                courts: [
                  {
                    id: 1,
                    name: 'Cancha 1',
                    club: { id: 1, name: 'Club Norte' },
                  },
                ],
              }),
          },
        },
        {
          provide: MatchesApiService,
          useValue: {
            createMatch: createMatchSpy,
          },
        },
        {
          provide: ApiSessionService,
          useValue: {
            user: () => ({ id: 1, name: 'Tester', email: 't@test.com' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchCreate);
    component = fixture.componentInstance as MatchCreateHarness;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('posts backend payload after completing wizard steps', async () => {
    component.form.patchValue({
      matchDate: '2026-10-22',
      matchTime: '19:00',
      duration: 90,
      courtId: 1,
      autoJoin: true,
      levelRequired: 'fifth',
      rosterMode: 'individual',
      joinPolicy: 'auto',
    });

    const steps: CreateWizardStep[] = ['date', 'place', 'play', 'category', 'who', 'visibility'];
    for (const step of steps) {
      component.continue(step);
    }

    component.submit();
    await fixture.whenStable();

    expect(createMatchSpy).toHaveBeenCalledWith(
      buildCreateMatchPayload({
        courtId: 1,
        date: '2026-10-22',
        time: '19:00',
        duration: 90,
        rosterMode: 'individual',
        levelRequired: 'fifth',
        autoJoin: true,
        joinPolicy: 'auto',
      }),
    );
  });

  it('navigates to match detail on success', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.patchValue({
      matchDate: '2026-10-22',
      matchTime: '19:00',
      courtId: 1,
      autoJoin: false,
      levelRequired: 'fifth',
      joinPolicy: 'manual',
    });

    const steps: CreateWizardStep[] = ['date', 'place', 'play', 'category', 'who', 'visibility'];
    for (const step of steps) {
      component.continue(step);
    }

    component.submit();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/matches', 42]);
    const payload = createMatchSpy.mock.calls.at(-1)?.[0] as {
      auto_join: boolean;
      join_policy: string;
    };
    expect(payload.auto_join).toBe(false);
    expect(payload.join_policy).toBe('manual');
  });
});
