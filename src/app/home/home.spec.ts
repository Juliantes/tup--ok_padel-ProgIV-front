import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { of } from 'rxjs';

import { provideTranslateTesting } from '../testing/translate-testing';
import { CourtsApiService } from '../core/api/courts-api.service';
import { CourtBookingsApiService } from '../core/api/court-bookings-api.service';
import { MatchesApiService } from '../core/api/matches-api.service';
import { ApiSessionService } from '../core/api/api-session.service';
import { AddressesApiService } from '../core/api/addresses-api.service';
import { Home } from './home';

@Component({ standalone: true, template: '' })
class StubComponent {}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home, StubComponent],
      providers: [
        provideRouter([
          { path: 'matches', component: StubComponent },
          { path: 'courts', component: StubComponent },
          { path: 'matches/new', component: StubComponent },
        ]),
        ...provideTranslateTesting(),
        {
          provide: CourtsApiService,
          useValue: {
            listCourts: () => of({ courts: [] }),
          },
        },
        {
          provide: CourtBookingsApiService,
          useValue: {
            getClubAvailability: () =>
              of({
                club: { id: 1, name: 'Club', address: 'A', phone: '1', email: null, card_theme: 0 },
                date: '2026-11-09',
                courts: [],
                rows: [],
                cells: [],
              }),
          },
        },
        {
          provide: MatchesApiService,
          useValue: {
            listMatches: () =>
              of({
                matches: [],
                meta: { current_page: 1, per_page: 50, total_pages: 0, total_count: 0 },
              }),
          },
        },
        {
          provide: ApiSessionService,
          useValue: {
            user: () => ({ id: 1, name: 'Test', self_level: 5, court_side: 'derecha' }),
          },
        },
        {
          provide: AddressesApiService,
          useValue: {
            autocomplete: () => of({ addresses: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
