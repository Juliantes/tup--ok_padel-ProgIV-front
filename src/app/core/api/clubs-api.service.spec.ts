import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ClubsApiService } from './clubs-api.service';

describe('ClubsApiService', () => {
  let service: ClubsApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiBaseUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClubsApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClubsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists time slots for a court', () => {
    service.listTimeSlots(1, 10).subscribe((response) => {
      expect(response.time_slots.length).toBe(1);
    });

    const req = httpMock.expectOne(`${base}/clubs/1/courts/10/time_slots`);
    expect(req.request.method).toBe('GET');
    req.flush({
      time_slots: [
        {
          id: 5,
          court_id: 10,
          day_of_week: 1,
          start_time: '10:00',
          end_time: '11:30',
          is_available: true,
        },
      ],
    });
  });

  it('creates a time slot', () => {
    const payload = { day_of_week: 1, start_time: '10:00', end_time: '11:30', is_available: true };
    service.createTimeSlot(1, 10, payload).subscribe();

    const req = httpMock.expectOne(`${base}/clubs/1/courts/10/time_slots`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ time_slot: { id: 5, court_id: 10, ...payload } });
  });

  it('updates a time slot', () => {
    service.updateTimeSlot(1, 10, 5, { is_available: false }).subscribe();

    const req = httpMock.expectOne(`${base}/clubs/1/courts/10/time_slots/5`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ is_available: false });
    req.flush({
      time_slot: {
        id: 5,
        court_id: 10,
        day_of_week: 1,
        start_time: '10:00',
        end_time: '11:30',
        is_available: false,
      },
    });
  });

  it('deletes a time slot', () => {
    service.deleteTimeSlot(1, 10, 5).subscribe();

    const req = httpMock.expectOne(`${base}/clubs/1/courts/10/time_slots/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('bulk replaces time slots', () => {
    const payload = {
      open_time: '08:00',
      close_time: '23:00',
      duration_minutes: 90,
      day_of_weeks: [1, 2, 3, 4, 5],
    };
    service.bulkCreateTimeSlots(1, 10, payload).subscribe((response) => {
      expect(response.time_slots.length).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(`${base}/clubs/1/courts/10/time_slots/bulk`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      time_slots: [
        {
          id: 1,
          court_id: 10,
          day_of_week: 1,
          start_time: '08:00',
          end_time: '09:30',
          is_available: true,
        },
      ],
    });
  });

  it('creates a walk-in booking', () => {
    const payload = {
      court_id: 10,
      time_slot_id: 5,
      date: '2026-11-04',
      walk_in_guest_name: 'Juan',
    };
    service.createWalkInBooking(1, payload).subscribe();

    const req = httpMock.expectOne(`${base}/clubs/1/walk_in_bookings`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      match: { id: 99, court_id: 10, time_slot_id: 5, date: '2026-11-04', status: 'confirmed' },
    });
  });

  it('cancels a walk-in booking', () => {
    service.cancelWalkInBooking(1, 99).subscribe();

    const req = httpMock.expectOne(`${base}/clubs/1/walk_in_bookings/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
