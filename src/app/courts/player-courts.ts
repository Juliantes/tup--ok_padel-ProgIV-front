import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
import { ClubBrowseGrid } from '../club/club-browse/club-browse-grid/club-browse-grid';
import { ClubBrowseItem } from '../club/club-browse/club-browse.models';
import { clubHeroTheme } from '../club/club-browse/club-browse.utils';
import {
  buildScheduleDateOptions,
  formatClubPrice,
  scheduleCellKey,
  todayIsoDate,
  whatsappClubUrl,
} from '../club/club-schedule.utils';
import {
  CourtBookingDialog,
  CourtBookingDialogData,
  CourtBookingDialogResult,
} from './court-booking-dialog/court-booking-dialog';
import {
  TimelineSegment,
  buildCourtTimelineSegments,
  buildHourTicks,
  myBookingSlotKey,
  normalizeBookingDate,
  scheduleDayHoursRange,
} from './player-schedule-timeline.utils';
import {
  MatchCreateSlotSelection,
  saveMatchCreateSlotSelection,
} from '../matches/match-create-draft.utils';

export interface PlayerCourtDetail {
  id: number;
  name: string;
  court_type: string;
  description: string | null;
}

function parseSlotStart(isoDate: string, startTime: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function isoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function localDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ClubBrowseGrid,
  ],
  templateUrl: './player-courts.html',
  styleUrl: './player-courts.css',
})
export class PlayerCourts implements OnInit {
  private readonly courtsApi = inject(CourtsApiService);
  private readonly courtBookingsApi = inject(CourtBookingsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly createMatchIntent = signal(false);

  protected readonly clubs = signal<PlayerClubOption[]>([]);
  protected readonly clubCourtsMap = signal<Map<number, PlayerCourtDetail[]>>(new Map());
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly schedule = signal<PlayerAvailabilityResponse | null>(null);
  protected readonly myBookings = signal<CourtBookingSummary[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly dateOptions = buildScheduleDateOptions(14);

  protected readonly minSelectableDate = this.dateOptions[0]?.isoDate ?? todayIsoDate();

  protected readonly maxSelectableDate =
    this.dateOptions[this.dateOptions.length - 1]?.isoDate ?? todayIsoDate();

  protected readonly minSelectableDateObject = isoToLocalDate(this.minSelectableDate);

  protected readonly maxSelectableDateObject = isoToLocalDate(this.maxSelectableDate);

  protected readonly scheduleDateControl = new FormControl(isoToLocalDate(todayIsoDate()));

  protected readonly browseClubs = computed((): ClubBrowseItem[] => this.clubs());

  protected readonly showClubBrowse = computed(() => {
    if (this.clubs().length <= 1) {
      return false;
    }
    return this.selectedClubId() === null;
  });

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  protected readonly selectedClubCourts = computed(() => {
    const id = this.selectedClubId();
    if (!id) {
      return [];
    }
    return this.clubCourtsMap().get(id) ?? [];
  });

  protected readonly clubCourtStats = computed(() => {
    const courts = this.selectedClubCourts();
    const indoor = courts.filter((court) => court.court_type === 'indoor').length;
    return {
      total: courts.length,
      indoor,
      outdoor: courts.length - indoor,
    };
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

  protected readonly hoursRange = computed(() => scheduleDayHoursRange(this.scheduleRows()));

  protected readonly hourTicks = computed(() => {
    const range = this.hoursRange();
    return range ? buildHourTicks(range) : [];
  });

  protected readonly myBookingSlots = computed(() => {
    const iso = this.selectedDate();
    const clubId = this.selectedClubId();
    const slots = new Set<string>();
    this.myBookings().forEach((booking) => {
      if (!booking.court_id) {
        return;
      }
      if (clubId && booking.club?.id && booking.club.id !== clubId) {
        return;
      }
      if (normalizeBookingDate(booking.date) !== iso) {
        return;
      }
      const start = booking.time_slot?.start_time;
      if (start) {
        slots.add(myBookingSlotKey(booking.court_id, iso, start));
      }
    });
    return slots;
  });

  protected readonly timelineByCourt = computed(() => {
    const courts = this.displayCourts();
    const rows = this.scheduleRows();
    const range = this.hoursRange();
    const map = new Map<number, TimelineSegment[]>();
    if (!range || courts.length === 0) {
      return map;
    }

    const iso = this.selectedDate();
    const slots = this.myBookingSlots();

    courts.forEach((court) => {
      map.set(
        court.id,
        buildCourtTimelineSegments(
          court.id,
          rows,
          range,
          (courtId, startTime) => this.cellFor(courtId, startTime),
          (courtId, startTime) => slots.has(myBookingSlotKey(courtId, iso, startTime)),
          (courtId, startTime) => this.canBookSlot(courtId, startTime),
        ),
      );
    });
    return map;
  });

  protected readonly selectedDateOption = computed(
    () => this.dateOptions.find((option) => option.isoDate === this.selectedDate()) ?? null,
  );

  protected readonly canGoPrevDate = computed(() => {
    const idx = this.dateOptions.findIndex((option) => option.isoDate === this.selectedDate());
    return idx > 0;
  });

  protected readonly canGoNextDate = computed(() => {
    const idx = this.dateOptions.findIndex((option) => option.isoDate === this.selectedDate());
    return idx >= 0 && idx < this.dateOptions.length - 1;
  });

  protected readonly upcomingBookings = computed(() => {
    const now = Date.now();
    return this.myBookings().filter((booking) => new Date(booking.date).getTime() >= now);
  });

  protected readonly pastBookings = computed(() => {
    const now = Date.now();
    return this.myBookings().filter((booking) => new Date(booking.date).getTime() < now);
  });

  protected readonly whatsappHrefFor = (club: ClubBrowseItem): string | null => {
    const phone = club.phone?.trim();
    if (!phone) {
      return null;
    }
    const message = this.translate.instant('PLAYER_COURTS.WHATSAPP_MESSAGE', {
      club: club.name,
    });
    return whatsappClubUrl(phone, message);
  };

  ngOnInit(): void {
    this.createMatchIntent.set(this.route.snapshot.queryParamMap.get('intent') === 'create-match');
    void this.bootstrap();
  }

  protected enterClub(clubId: number): void {
    this.selectedClubId.set(clubId);
    void this.loadSchedule();
  }

  protected backToClubBrowse(): void {
    this.selectedClubId.set(null);
    this.schedule.set(null);
    this.errorMessage.set(null);
  }

  protected selectDate(isoDate: string): void {
    this.selectedDate.set(isoDate);
    this.scheduleDateControl.setValue(isoToLocalDate(isoDate), { emitEvent: false });
    void this.loadSchedule();
  }

  protected shiftDate(delta: -1 | 1): void {
    const idx = this.dateOptions.findIndex((option) => option.isoDate === this.selectedDate());
    const next = this.dateOptions[idx + delta];
    if (next) {
      this.selectDate(next.isoDate);
    }
  }

  protected onScheduleDatePicked(event: MatDatepickerInputEvent<Date>): void {
    const value = event.value;
    if (!value) {
      return;
    }
    const iso = localDateToIso(value);
    if (!this.dateOptions.some((option) => option.isoDate === iso)) {
      return;
    }
    this.selectDate(iso);
  }

  protected themeClass(club: PlayerClubOption): string {
    return `player-club-profile__banner--theme-${clubHeroTheme(club)}`;
  }

  protected mapsEmbedUrl(address: string): SafeResourceUrl {
    const q = encodeURIComponent(address);
    const url = `https://maps.google.com/maps?q=${q}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected mapsSearchUrl(address: string): string {
    const q = encodeURIComponent(address);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  protected courtDetail(courtId: number): PlayerCourtDetail | undefined {
    return this.selectedClubCourts().find((court) => court.id === courtId);
  }

  protected timelineForCourt(courtId: number): TimelineSegment[] {
    return this.timelineByCourt().get(courtId) ?? [];
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

    const selectForMatch = this.createMatchIntent();

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
        purpose: selectForMatch ? 'select' : 'book',
      },
      width: 'min(96vw, 24rem)',
    });

    ref.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        void this.refreshAfterMutation();
        return;
      }
      if (result && typeof result === 'object' && 'timeSlotId' in result) {
        saveMatchCreateSlotSelection(result as MatchCreateSlotSelection);
        void this.router.navigate(['/matches/new']);
      }
    });
  }

  protected openBookingSegment(courtId: number, courtName: string, segment: TimelineSegment): void {
    if (segment.kind !== 'available') {
      return;
    }
    this.openBooking(courtId, courtName, segment.startTime);
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
      const courtsMap = new Map<number, PlayerCourtDetail[]>();

      courtsResponse.courts.forEach((court) => {
        if (!clubMap.has(court.club.id)) {
          clubMap.set(court.club.id, {
            id: court.club.id,
            name: court.club.name,
            address: court.club.address ?? '',
            card_theme: court.club.card_theme,
          });
        }

        const clubCourts = courtsMap.get(court.club.id) ?? [];
        clubCourts.push({
          id: court.id,
          name: court.name,
          court_type: court.court_type,
          description: court.description,
        });
        courtsMap.set(court.club.id, clubCourts);
      });

      this.clubCourtsMap.set(courtsMap);
      const clubList = [...clubMap.values()].sort((a, b) => a.name.localeCompare(b.name));
      this.clubs.set(clubList);
      if (clubList.length === 1) {
        this.selectedClubId.set(clubList[0].id);
        await this.loadSchedule();
      } else if (clubList.length > 1) {
        this.selectedClubId.set(null);
      }
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private syncClubPhoneFromSchedule(response: PlayerAvailabilityResponse): void {
    const phone = response.club.phone?.trim();
    const cardTheme = response.club.card_theme;
    this.clubs.update((list) =>
      list.map((club) => {
        if (club.id !== response.club.id) {
          return club;
        }
        return {
          ...club,
          ...(phone ? { phone } : {}),
          ...(cardTheme !== undefined && cardTheme !== null ? { card_theme: cardTheme } : {}),
        };
      }),
    );
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
      this.syncClubPhoneFromSchedule(response);
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
