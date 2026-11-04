import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ClubScheduleCell, ClubScheduleResponse, OwnerClub } from '../core/api/club.models';
import { ClubsApiService } from '../core/api/clubs-api.service';
import { readApiErrorMessage } from '../core/api/api-errors';
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
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './club-owner.html',
  styleUrl: './club-owner.css',
})
export class ClubOwner implements OnInit {
  private readonly clubsApi = inject(ClubsApiService);
  private readonly translate = inject(TranslateService);

  protected readonly clubs = signal<OwnerClub[]>([]);
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly selectedDate = signal(todayIsoDate());
  protected readonly schedule = signal<ClubScheduleResponse | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly dateOptions = buildScheduleDateOptions();

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  protected readonly cellIndex = computed(() => {
    const current = this.schedule();
    return current ? indexScheduleCells(current.cells) : new Map<string, ClubScheduleCell>();
  });

  ngOnInit(): void {
    void this.loadClubs();
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

  protected cellFor(courtId: number, startTime: string): ClubScheduleCell | undefined {
    return this.cellIndex().get(scheduleCellKey(courtId, startTime));
  }

  protected whatsappHref(club: OwnerClub): string {
    const message = this.translate.instant('CLUB_OWNER.WHATSAPP_MESSAGE', {
      club: club.name,
    });
    return whatsappClubUrl(club.phone, message);
  }

  protected reserveViaWhatsApp(club: OwnerClub, courtName: string, startTime: string): void {
    const message = this.translate.instant('CLUB_OWNER.RESERVE_WHATSAPP_MESSAGE', {
      club: club.name,
      court: courtName,
      time: startTime,
      date: this.selectedDate(),
    });
    window.open(whatsappClubUrl(club.phone, message), '_blank', 'noopener,noreferrer');
  }

  private async loadClubs(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const response = await firstValueFrom(this.clubsApi.listClubs());
      this.clubs.set(response.clubs);
      if (response.clubs.length > 0) {
        this.selectClub(response.clubs[0].id);
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
      const response = await firstValueFrom(this.clubsApi.getSchedule(clubId, this.selectedDate()));
      this.schedule.set(response);
    } catch (error: unknown) {
      this.schedule.set(null);
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
