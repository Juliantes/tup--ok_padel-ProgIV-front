import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ApiSessionService } from '../core/api/api-session.service';
import { CourtsApiService } from '../core/api/courts-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { MatchesList } from './matches-list';

describe('MatchesList', () => {
  let component: MatchesList;
  let fixture: ComponentFixture<MatchesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchesList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        ...provideTranslateTesting(),
        {
          provide: MatchesApiService,
          useValue: {
            listMatches: () =>
              of({
                matches: [],
                meta: { current_page: 1, per_page: 50, total_pages: 0, total_count: 0 },
              }),
            listMyMatches: () =>
              of({
                matches: [],
                meta: { current_page: 1, per_page: 50, total_pages: 0, total_count: 0 },
              }),
          },
        },
        {
          provide: CourtsApiService,
          useValue: {
            listCourts: () => of({ courts: [] }),
          },
        },
        {
          provide: ApiSessionService,
          useValue: {
            user: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MatchesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
