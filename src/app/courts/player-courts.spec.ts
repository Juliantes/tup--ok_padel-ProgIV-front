import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';

import { environment } from '../../environments/environment';
import { addDaysIso, todayIsoDate } from '../club/club-schedule.utils';
import { provideTranslateTesting } from '../testing/translate-testing';
import { PlayerCourts } from './player-courts';

describe('PlayerCourts', () => {
  let fixture: ComponentFixture<PlayerCourts>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCourts, MatDialogModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), ...provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCourts);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads clubs and availability without owner-only actions', async () => {
    const tomorrow = addDaysIso(todayIsoDate(), 1);
    const host = fixture.componentInstance as PlayerCourts & {
      selectDate: (isoDate: string) => void;
    };

    fixture.detectChanges();

    http.expectOne(`${environment.apiBaseUrl}/api/v1/courts`).flush({
      courts: [
        {
          id: 10,
          name: 'Cancha 1',
          court_type: 'indoor',
          price_per_hour: 100,
          status: 'active',
          color: 0,
          club: { id: 1, name: 'Club Test', address: 'Calle 1' },
        },
      ],
    });
    http
      .expectOne(`${environment.apiBaseUrl}/api/v1/me/court_bookings`)
      .flush({ court_bookings: [] });

    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const initialSchedule = http.match((req) =>
      req.urlWithParams.startsWith(`${environment.apiBaseUrl}/api/v1/clubs/1/availability`),
    )[0];
    initialSchedule.flush({
      club: { id: 1, name: 'Club Test', address: 'Calle 1', phone: '111', email: null },
      date: initialSchedule.request.params.get('date'),
      courts: [{ id: 10, name: 'Cancha 1', price_per_hour: 100, status: 'active', color: 0 }],
      rows: [],
      cells: [],
    });

    host.selectDate(tomorrow);
    await fixture.whenStable();

    const tomorrowSchedule = http.expectOne(
      (req) =>
        req.urlWithParams ===
        `${environment.apiBaseUrl}/api/v1/clubs/1/availability?date=${tomorrow}`,
    );
    tomorrowSchedule.flush({
      club: { id: 1, name: 'Club Test', address: 'Calle 1', phone: '111', email: null },
      date: tomorrow,
      courts: [{ id: 10, name: 'Cancha 1', price_per_hour: 100, status: 'active', color: 0 }],
      rows: [{ start_time: '10:00', end_time: '11:30' }],
      cells: [
        {
          court_id: 10,
          start_time: '10:00',
          state: 'available',
          time_slot_id: 5,
          end_time: '11:30',
        },
      ],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Club Test');
    expect(fixture.nativeElement.textContent).toContain('PLAYER_COURTS.RESERVE');
    expect(fixture.nativeElement.textContent).not.toContain('CLUB_OWNER.COURT_FORM.CREATE');
  });
});
