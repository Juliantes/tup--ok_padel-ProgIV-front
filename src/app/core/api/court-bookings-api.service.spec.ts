import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { CourtBookingsApiService } from './court-bookings-api.service';

describe('CourtBookingsApiService', () => {
  let service: CourtBookingsApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CourtBookingsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads club availability', () => {
    service.getClubAvailability(3, '2026-11-10').subscribe();
    const req = httpMock.expectOne(`${base}/clubs/3/availability?date=2026-11-10`);
    expect(req.request.method).toBe('GET');
    req.flush({ club: {}, date: '2026-11-10', courts: [], rows: [], cells: [] });
  });

  it('creates a court booking', () => {
    const payload = {
      club_id: 1,
      court_id: 2,
      time_slot_id: 5,
      date: '2026-11-10',
    };
    service.createCourtBooking(payload).subscribe();
    const req = httpMock.expectOne(`${base}/court_bookings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ court_booking: { id: 1 } });
  });

  it('lists my court bookings', () => {
    service.listMyCourtBookings().subscribe();
    const req = httpMock.expectOne(`${base}/me/court_bookings`);
    expect(req.request.method).toBe('GET');
    req.flush({ court_bookings: [] });
  });

  it('cancels a court booking', () => {
    service.cancelCourtBooking(9).subscribe();
    const req = httpMock.expectOne(`${base}/court_bookings/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
