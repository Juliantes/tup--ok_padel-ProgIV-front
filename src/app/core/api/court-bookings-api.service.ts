import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import {
  CourtBookingPayload,
  CourtBookingResponse,
  CourtBookingsIndexResponse,
  PlayerAvailabilityResponse,
} from './club.models';

@Injectable({
  providedIn: 'root',
})
export class CourtBookingsApiService {
  private readonly http = inject(HttpClient);

  getClubAvailability(clubId: number, date: string): Observable<PlayerAvailabilityResponse> {
    return this.http.get<PlayerAvailabilityResponse>(apiV1Url(`clubs/${clubId}/availability`), {
      params: { date },
    });
  }

  createCourtBooking(payload: CourtBookingPayload): Observable<CourtBookingResponse> {
    return this.http.post<CourtBookingResponse>(apiV1Url('court_bookings'), payload);
  }

  listMyCourtBookings(): Observable<CourtBookingsIndexResponse> {
    return this.http.get<CourtBookingsIndexResponse>(apiV1Url('me/court_bookings'));
  }

  cancelCourtBooking(id: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`court_bookings/${id}`));
  }
}
