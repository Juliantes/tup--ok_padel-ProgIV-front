import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { provideTranslateTesting } from '../testing/translate-testing';
import { ClubOwner } from './club-owner';
import { todayIsoDate } from './club-schedule.utils';

describe('ClubOwner', () => {
  let fixture: ComponentFixture<ClubOwner>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubOwner],
      providers: [provideHttpClient(), provideHttpClientTesting(), ...provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubOwner);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads schedule grid for the first club', async () => {
    fixture.detectChanges();

    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs`).flush({
      clubs: [
        { id: 1, name: 'Ok Padel Club', address: 'Av. Test 123', phone: '1144556677', email: null },
      ],
    });

    await fixture.whenStable();

    const scheduleReq = http.expectOne(
      (req) =>
        req.url === `${environment.apiBaseUrl}/api/v1/clubs/1/schedule` &&
        req.params.get('date') === todayIsoDate(),
    );
    scheduleReq.flush({
      club: {
        id: 1,
        name: 'Ok Padel Club',
        address: 'Av. Test 123',
        phone: '1144556677',
        email: null,
      },
      date: todayIsoDate(),
      courts: [{ id: 10, name: 'Cancha 1', price_per_hour: 8000, status: 'active' }],
      rows: [{ start_time: '10:00', end_time: '11:30' }],
      cells: [
        {
          court_id: 10,
          start_time: '10:00',
          state: 'available',
          time_slot_id: 5,
          end_time: '11:30',
          match_id: null,
        },
      ],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ok Padel Club');
    expect(fixture.nativeElement.textContent).toContain('Av. Test 123');
    expect(fixture.nativeElement.textContent).toContain('10:00');
    expect(fixture.nativeElement.textContent).toContain('CLUB_OWNER.RESERVE');
  });
});
