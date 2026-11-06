import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  CourtBookingSummary,
  PlayerAvailabilityCell,
  PlayerAvailabilityResponse,
  PlayerClubOption,
} from '../core/api/club.models';
import { CourtBookingsApiService } from '../core/api/court-bookings-api.service';
import { CourtsApiService } from '../core/api/courts-api.service';
import { readApiErrorMessage } from '../core/api/api-errors';
import {
  buildScheduleDateOptions,
  formatClubPrice,
  scheduleCellKey,
  todayIsoDate,
} from '../club/club-schedule.utils';
import {
  CourtBookingDialog,
  CourtBookingDialogData,
  CourtBookingDialogResult,
} from './court-booking-dialog/court-booking-dialog';

function parseSlotStart(isoDate: string, startTime: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function slotDurationMinutes(startTime: string, endTime: string | null): number {
  if (!endTime) {
    return 90;
  }
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return endH * 60 + endM - (startH * 60 + startM);
}

@Component({
  selector: 'app-player-courts',
  imports: [MatButtonModule, TranslatePipe],
  templateUrl: './player-courts.html',
  styleUrl: './player-courts.css',
})
export class PlayerCourts implements OnInit {
  private readonly courtsApi = inject(CourtsApiService);
  private readonly courtBookingsApi = inject(CourtBookingsApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly clubs = signal<PlayerClubOption[]>([]);
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly schedule = signal<PlayerAvailabilityResponse | null>(null);
  protected readonly myBookings = signal<CourtBookingSummary[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly dateOptions = buildScheduleDateOptions(14);

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  protected readonly cellIndex = computed(() => {
    const current = this.schedule();
    const map = new Map<string, PlayerAvailabilityCell>();
    if (!current) {
      return map;
    }
    current.cells.forEach((cell) => {
      map.set(scheduleCellKey(cell.court_id, cell.start_time), cell);
    });
    return map;
  });

  protected readonly displayCourts = computed(() => this.schedule()?.courts ?? []);
  protected readonly scheduleRows = computed(() => this.schedule()?.rows ?? []);

  protected readonly upcomingBookings = computed(() => {
    const now = Date.now();
    return this.myBookings().filter((booking) => new Date(booking.date).getTime() >= now);
  });

  protected readonly pastBookings = computed(() => {
    const now = Date.now();
    return this.myBookings().filter((booking) => new Date(booking.date).getTime() < now);
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  protected selectClub(clubId: number): void {
    this.selectedClubId.set(clubId);
    void this.loadSchedule();
  }

  protected selectDate(isoDate: string): void {
    this.selectedDate.set(isoDate);
    void this.loadSchedule();
  }

  protected formatPrice(value: number): string {
    return formatClubPrice(value);
  }

  protected cellFor(courtId: number, startTime: string): PlayerAvailabilityCell | undefined {
    return this.cellIndex().get(scheduleCellKey(courtId, startTime));
  }

  protected cellState(courtId: number, startTime: string): PlayerAvailabilityCell['state'] {
    return this.cellFor(courtId, startTime)?.state ?? 'empty';
  }

  protected canBookSlot(courtId: number, startTime: string): boolean {
    const cell = this.cellFor(courtId, startTime);
    if (!cell || cell.state !== 'available' || !cell.time_slot_id) {
      return false;
    }
    return parseSlotStart(this.selectedDate(), startTime).getTime() > Date.now();
  }

  protected openBooking(courtId: number, courtName: string, startTime: string): void {
    const club = this.selectedClub();
    const cell = this.cellFor(courtId, startTime);
    if (!club || !cell?.time_slot_id || !this.canBookSlot(courtId, startTime)) {
      return;
    }

    const court = this.displayCourts().find((item) => item.id === courtId);
    if (!court) {
      return;
    }

    const ref = this.dialog.open<
      CourtBookingDialog,
      CourtBookingDialogData,
      CourtBookingDialogResult
    >(CourtBookingDialog, {
      data: {
        clubId: club.id,
        clubName: club.name,
        courtId,
        courtName,
        timeSlotId: cell.time_slot_id,
        date: this.selectedDate(),
        startTime,
        endTime: cell.end_time,
        pricePerHour: court.price_per_hour,
        durationMinutes: slotDurationMinutes(startTime, cell.end_time),
      },
      width: 'min(96vw, 24rem)',
    });

    ref.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        void this.refreshAfterMutation();
      }
    });
  }

  protected async cancelBooking(booking: CourtBookingSummary): Promise<void> {
    if (!booking.cancellable) {
      return;
    }

    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.courtBookingsApi.cancelCourtBooking(booking.id));
      await this.refreshAfterMutation();
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
      void this.loadSchedule();
      void this.loadMyBookings();
    }
  }

  protected formatBookingWhen(booking: CourtBookingSummary): string {
    const date = new Date(booking.date);
    const datePart = date.toLocaleDateString('es-AR');
    const slot = booking.time_slot;
    if (slot) {
      return `${datePart} · ${slot.start_time}–${slot.end_time}`;
    }
    return datePart;
  }

  private async bootstrap(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [courtsResponse] = await Promise.all([
        firstValueFrom(this.courtsApi.listCourts()),
        this.loadMyBookings(),
      ]);

      const clubMap = new Map<number, PlayerClubOption>();
      courtsResponse.courts.forEach((court) => {
        if (!clubMap.has(court.club.id)) {
          clubMap.set(court.club.id, {
            id: court.club.id,
            name: court.club.name,
            address: court.club.address ?? '',
          });
        }
      });

      const clubList = [...clubMap.values()].sort((a, b) => a.name.localeCompare(b.name));
      this.clubs.set(clubList);
      if (clubList.length > 0) {
        this.selectedClubId.set(clubList[0].id);
        await this.loadSchedule();
      }
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSchedule(): Promise<void> {
    const clubId = this.selectedClubId();
    if (!clubId) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const response = await firstValueFrom(
        this.courtBookingsApi.getClubAvailability(clubId, this.selectedDate()),
      );
      this.schedule.set(response);
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
      this.schedule.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadMyBookings(): Promise<void> {
    const response = await firstValueFrom(this.courtBookingsApi.listMyCourtBookings());
    this.myBookings.set(response.court_bookings);
  }

  private async refreshAfterMutation(): Promise<void> {
    await Promise.all([this.loadSchedule(), this.loadMyBookings()]);
  }
}
