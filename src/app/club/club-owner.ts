import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  ClubScheduleCell,
  ClubScheduleCourt,
  ClubScheduleResponse,
  OwnerClub,
} from '../core/api/club.models';
import { ClubsApiService } from '../core/api/clubs-api.service';
import { readApiErrorMessage } from '../core/api/api-errors';
import { Court } from '../core/api/match.models';
import { ClubBrowseGrid } from './club-browse/club-browse-grid/club-browse-grid';
import { ClubBrowseHero } from './club-browse/club-browse-hero/club-browse-hero';
import { ClubBrowseItem } from './club-browse/club-browse.models';
import {
  CourtFormDialog,
  CourtFormDialogData,
  CourtFormDialogResult,
} from './court-form-dialog/court-form-dialog';
import {
  TimeSlotsPanel,
  TimeSlotsPanelData,
  TimeSlotsPanelResult,
} from './time-slots-panel/time-slots-panel';
import {
  WalkInBookingDialog,
  WalkInBookingDialogData,
  WalkInBookingDialogResult,
} from './walk-in-booking-dialog/walk-in-booking-dialog';
import {
  buildScheduleDateOptions,
  formatClubPrice,
  indexScheduleCells,
  scheduleCellKey,
  todayIsoDate,
  whatsappClubUrl,
} from './club-schedule.utils';

@Component({
  selector: 'app-club-owner',
  imports: [MatButtonModule, MatIconModule, TranslatePipe, ClubBrowseGrid, ClubBrowseHero],
  templateUrl: './club-owner.html',
  styleUrl: './club-owner.css',
})
export class ClubOwner implements OnInit {
  private readonly clubsApi = inject(ClubsApiService);
  private readonly translate = inject(TranslateService);
  private readonly dialog = inject(MatDialog);

  protected readonly clubs = signal<OwnerClub[]>([]);
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly schedule = signal<ClubScheduleResponse | null>(null);
  protected readonly courts = signal<ClubScheduleCourt[]>([]);
  private readonly fullCourts = signal<Court[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** 14 días: permite ver dos ocurrencias del mismo día de la semana (p. ej. dos lunes). */
  protected readonly dateOptions = buildScheduleDateOptions(14);

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  protected readonly cellIndex = computed(() => {
    const current = this.schedule();
    return current ? indexScheduleCells(current.cells) : new Map<string, ClubScheduleCell>();
  });

  protected readonly displayCourts = computed((): ClubScheduleCourt[] => {
    const fromSchedule = this.schedule()?.courts ?? [];
    if (fromSchedule.length > 0) {
      return fromSchedule;
    }
    return this.courts();
  });

  protected readonly scheduleRows = computed(() => this.schedule()?.rows ?? []);

  protected readonly browseClubs = computed((): ClubBrowseItem[] => this.clubs());

  protected readonly showClubBrowse = computed(() => {
    if (this.clubs().length <= 1) {
      return false;
    }
    return this.selectedClubId() === null;
  });

  ngOnInit(): void {
    void this.loadClubs();
  }

  protected selectClub(clubId: number): void {
    this.selectedClubId.set(clubId);
    void this.loadSchedule();
  }

  protected enterClub(clubId: number): void {
    this.selectClub(clubId);
  }

  protected backToClubBrowse(): void {
    this.selectedClubId.set(null);
    this.schedule.set(null);
    this.courts.set([]);
    this.fullCourts.set([]);
    this.errorMessage.set(null);
  }

  protected readonly whatsappHrefFor = (club: ClubBrowseItem): string | null => {
    const phone = club.phone?.trim();
    if (!phone) {
      return null;
    }
    const message = this.translate.instant('CLUB_OWNER.WHATSAPP_MESSAGE', {
      club: club.name,
    });
    return whatsappClubUrl(phone, message);
  };

  protected selectDate(isoDate: string): void {
    this.selectedDate.set(isoDate);
    void this.loadSchedule();
  }

  protected formatPrice(value: number): string {
    return formatClubPrice(value);
  }

  protected cellFor(courtId: number, startTime: string): ClubScheduleCell | undefined {
    return this.cellIndex().get(scheduleCellKey(courtId, startTime));
  }

  protected cellState(courtId: number, startTime: string): ClubScheduleCell['state'] {
    return this.cellFor(courtId, startTime)?.state ?? 'empty';
  }

  protected whatsappHref(club: OwnerClub): string {
    const message = this.translate.instant('CLUB_OWNER.WHATSAPP_MESSAGE', {
      club: club.name,
    });
    return whatsappClubUrl(club.phone, message);
  }

  protected openCreateCourt(): void {
    const clubId = this.selectedClubId();
    if (!clubId) {
      return;
    }
    this.openCourtDialog({ clubId });
  }

  protected openEditCourt(court: ClubScheduleCourt, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const clubId = this.selectedClubId();
    if (!clubId) {
      return;
    }
    const fullCourt = this.fullCourts().find((item) => item.id === court.id);
    if (!fullCourt) {
      return;
    }
    this.openCourtDialog({ clubId, court: fullCourt });
  }

  protected openTimeSlots(court: ClubScheduleCourt): void {
    const clubId = this.selectedClubId();
    if (!clubId) {
      return;
    }
    const ref = this.dialog.open<TimeSlotsPanel, TimeSlotsPanelData, TimeSlotsPanelResult>(
      TimeSlotsPanel,
      {
        data: {
          clubId,
          courtId: court.id,
          courtName: court.name,
          initialDate: this.selectedDate(),
          dateOptions: this.dateOptions,
          onScheduleChanged: () => {
            void this.refreshAfterMutation();
          },
        },
        width: 'min(96vw, 36rem)',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === 'changed') {
        void this.refreshAfterMutation();
      }
    });
  }

  protected openWalkInBooking(court: ClubScheduleCourt, startTime: string): void {
    const clubId = this.selectedClubId();
    const cell = this.cellFor(court.id, startTime);
    if (!clubId || !cell?.time_slot_id) {
      return;
    }

    const ref = this.dialog.open<
      WalkInBookingDialog,
      WalkInBookingDialogData,
      WalkInBookingDialogResult
    >(WalkInBookingDialog, {
      data: {
        clubId,
        courtId: court.id,
        courtName: court.name,
        timeSlotId: cell.time_slot_id,
        date: this.selectedDate(),
        startTime,
      },
      width: 'min(96vw, 24rem)',
    });

    ref.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        void this.refreshAfterMutation();
      }
    });
  }

  protected async cancelWalkIn(court: ClubScheduleCourt, startTime: string): Promise<void> {
    const clubId = this.selectedClubId();
    const cell = this.cellFor(court.id, startTime);
    if (!clubId || !cell?.match_id || !cell.walk_in) {
      return;
    }

    const confirmed = window.confirm(this.translate.instant('CLUB_OWNER.CANCEL.CONFIRM'));
    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.clubsApi.cancelWalkInBooking(clubId, cell.match_id));
      await this.refreshAfterMutation();
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
      await this.refreshAfterMutation();
    }
  }

  async refreshAfterMutation(): Promise<void> {
    await this.loadSchedule();
  }

  private openCourtDialog(data: CourtFormDialogData): void {
    const ref = this.dialog.open<CourtFormDialog, CourtFormDialogData, CourtFormDialogResult>(
      CourtFormDialog,
      {
        data,
        width: 'min(96vw, 26rem)',
      },
    );
    ref.afterClosed().subscribe((result) => {
      if (result === 'saved' || result === 'deleted') {
        void this.refreshAfterMutation();
      }
    });
  }

  private async loadClubs(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.clubsApi.listClubs());
      this.clubs.set(response.clubs);
      if (response.clubs.length === 1) {
        this.selectClub(response.clubs[0].id);
      } else if (response.clubs.length > 1) {
        this.selectedClubId.set(null);
        this.isLoading.set(false);
      } else {
        this.isLoading.set(false);
      }
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
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
      const courtsResponse = await firstValueFrom(this.clubsApi.listCourts(clubId));
      this.fullCourts.set(courtsResponse.courts);
      this.courts.set(
        courtsResponse.courts.map((court) => ({
          id: court.id,
          name: court.name,
          price_per_hour: court.price_per_hour,
          status: court.status as ClubScheduleCourt['status'],
          color: court.color,
        })),
      );

      const scheduleResponse = await firstValueFrom(
        this.clubsApi.getSchedule(clubId, this.selectedDate()),
      );
      this.schedule.set(scheduleResponse);
    } catch (error: unknown) {
      this.schedule.set(null);
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
