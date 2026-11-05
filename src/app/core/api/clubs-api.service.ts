import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiV1Url } from './api-base';
import {
  OwnerClubPayload,
  OwnerClubResponse,
  OwnerClubsResponse,
  OwnerCourtPayload,
  OwnerCourtResponse,
  OwnerCourtsResponse,
  ClubScheduleResponse,
  OwnerTimeSlotPayload,
  OwnerTimeSlotResponse,
  OwnerTimeSlotsResponse,
  OwnerBulkTimeSlotsPayload,
  OwnerDayOverridePayload,
  OwnerTimeSlotsForDateResponse,
  WalkInBookingPayload,
  WalkInBookingResponse,
} from './club.models';

@Injectable({
  providedIn: 'root',
})
export class ClubsApiService {
  private readonly http = inject(HttpClient);

  listClubs(): Observable<OwnerClubsResponse> {
    return this.http.get<OwnerClubsResponse>(apiV1Url('clubs'));
  }

  createClub(payload: OwnerClubPayload): Observable<OwnerClubResponse> {
    return this.http.post<OwnerClubResponse>(apiV1Url('clubs'), payload);
  }

  updateClub(id: number, payload: Partial<OwnerClubPayload>): Observable<OwnerClubResponse> {
    return this.http.patch<OwnerClubResponse>(apiV1Url(`clubs/${id}`), payload);
  }

  deleteClub(id: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`clubs/${id}`));
  }

  listCourts(clubId: number): Observable<OwnerCourtsResponse> {
    return this.http.get<OwnerCourtsResponse>(apiV1Url(`clubs/${clubId}/courts`));
  }

  createCourt(clubId: number, payload: OwnerCourtPayload): Observable<OwnerCourtResponse> {
    return this.http.post<OwnerCourtResponse>(apiV1Url(`clubs/${clubId}/courts`), payload);
  }

  updateCourt(
    clubId: number,
    courtId: number,
    payload: Partial<OwnerCourtPayload>,
  ): Observable<OwnerCourtResponse> {
    return this.http.patch<OwnerCourtResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}`),
      payload,
    );
  }

  deleteCourt(clubId: number, courtId: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`clubs/${clubId}/courts/${courtId}`));
  }

  getSchedule(clubId: number, date: string): Observable<ClubScheduleResponse> {
    return this.http.get<ClubScheduleResponse>(apiV1Url(`clubs/${clubId}/schedule`), {
      params: { date },
    });
  }

  listTimeSlots(clubId: number, courtId: number): Observable<OwnerTimeSlotsResponse> {
    return this.http.get<OwnerTimeSlotsResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots`),
    );
  }

  listTimeSlotsForDate(
    clubId: number,
    courtId: number,
    date: string,
  ): Observable<OwnerTimeSlotsForDateResponse> {
    return this.http.get<OwnerTimeSlotsForDateResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots`),
      { params: { date } },
    );
  }

  replaceDayOverride(
    clubId: number,
    courtId: number,
    payload: OwnerDayOverridePayload,
  ): Observable<OwnerTimeSlotsForDateResponse> {
    return this.http.put<OwnerTimeSlotsForDateResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots/day_override`),
      payload,
    );
  }

  clearDayOverride(clubId: number, courtId: number, date: string): Observable<void> {
    return this.http.delete<void>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots/day_override`),
      { params: { date } },
    );
  }

  createTimeSlot(
    clubId: number,
    courtId: number,
    payload: OwnerTimeSlotPayload,
  ): Observable<OwnerTimeSlotResponse> {
    return this.http.post<OwnerTimeSlotResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots`),
      payload,
    );
  }

  updateTimeSlot(
    clubId: number,
    courtId: number,
    timeSlotId: number,
    payload: Partial<OwnerTimeSlotPayload>,
  ): Observable<OwnerTimeSlotResponse> {
    return this.http.patch<OwnerTimeSlotResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots/${timeSlotId}`),
      payload,
    );
  }

  deleteTimeSlot(clubId: number, courtId: number, timeSlotId: number): Observable<void> {
    return this.http.delete<void>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots/${timeSlotId}`),
    );
  }

  bulkCreateTimeSlots(
    clubId: number,
    courtId: number,
    payload: OwnerBulkTimeSlotsPayload,
  ): Observable<OwnerTimeSlotsResponse> {
    return this.http.post<OwnerTimeSlotsResponse>(
      apiV1Url(`clubs/${clubId}/courts/${courtId}/time_slots/bulk`),
      payload,
    );
  }

  createWalkInBooking(
    clubId: number,
    payload: WalkInBookingPayload,
  ): Observable<WalkInBookingResponse> {
    return this.http.post<WalkInBookingResponse>(
      apiV1Url(`clubs/${clubId}/walk_in_bookings`),
      payload,
    );
  }

  cancelWalkInBooking(clubId: number, matchId: number): Observable<void> {
    return this.http.delete<void>(apiV1Url(`clubs/${clubId}/walk_in_bookings/${matchId}`));
  }
}
