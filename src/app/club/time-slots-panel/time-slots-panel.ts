import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readApiErrorMessage } from '../../core/api/api-errors';
import { OwnerTimeSlot } from '../../core/api/club.models';
import { ClubsApiService } from '../../core/api/clubs-api.service';
import {
  buildBulkSlotIntervals,
  durationHoursToMinutes,
  type BulkTimeSlotInterval,
} from '../time-slot-bulk.utils';

export interface TimeSlotsPanelData {
  clubId: number;
  courtId: number;
  courtName: string;
  onScheduleChanged?: () => void;
}

export type TimeSlotsPanelResult = 'changed';

const WEEKDAY_KEYS = [
  'CLUB_OWNER.TIME_SLOTS.DAY_0',
  'CLUB_OWNER.TIME_SLOTS.DAY_1',
  'CLUB_OWNER.TIME_SLOTS.DAY_2',
  'CLUB_OWNER.TIME_SLOTS.DAY_3',
  'CLUB_OWNER.TIME_SLOTS.DAY_4',
  'CLUB_OWNER.TIME_SLOTS.DAY_5',
  'CLUB_OWNER.TIME_SLOTS.DAY_6',
] as const;

const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

@Component({
  selector: 'app-time-slots-panel',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    TranslatePipe,
  ],
  templateUrl: './time-slots-panel.html',
  styleUrl: './time-slots-panel.css',
})
export class TimeSlotsPanel implements OnInit {
  private readonly dialogRef =
    inject<MatDialogRef<TimeSlotsPanel, TimeSlotsPanelResult | undefined>>(MatDialogRef);
  protected readonly data = inject<TimeSlotsPanelData>(MAT_DIALOG_DATA);
  private readonly clubsApi = inject(ClubsApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly weekdayKeys = WEEKDAY_KEYS;
  protected readonly slots = signal<OwnerTimeSlot[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly bulkError = signal<string | null>(null);
  protected readonly selectedBulkDays = signal<number[]>([...WEEKDAYS_MON_FRI]);

  protected readonly form = this.fb.nonNullable.group({
    day_of_week: [1, Validators.required],
    start_time: ['10:00', Validators.required],
    end_time: ['11:30', Validators.required],
    is_available: [true],
  });

  protected readonly bulkForm = this.fb.nonNullable.group({
    open_time: ['08:00', Validators.required],
    close_time: ['23:00', Validators.required],
    duration_hours: [1.5, [Validators.required, Validators.min(0.5)]],
  });

  protected readonly bulkPreviewIntervals = signal<BulkTimeSlotInterval[]>([]);

  ngOnInit(): void {
    void this.loadSlots();
    this.refreshBulkPreview();
    this.bulkForm.valueChanges.subscribe(() => this.refreshBulkPreview());
  }

  protected weekdayLabel(index: number): string {
    return WEEKDAY_KEYS[index];
  }

  protected isBulkDaySelected(day: number): boolean {
    return this.selectedBulkDays().includes(day);
  }

  protected toggleBulkDay(day: number, checked: boolean): void {
    const current = this.selectedBulkDays();
    if (checked) {
      if (!current.includes(day)) {
        this.selectedBulkDays.set([...current, day].sort((a, b) => a - b));
      }
      return;
    }
    this.selectedBulkDays.set(current.filter((value) => value !== day));
  }

  protected selectBulkWeekdays(): void {
    this.selectedBulkDays.set([...WEEKDAYS_MON_FRI]);
  }

  protected bulkPreview(): BulkTimeSlotInterval[] {
    return this.bulkPreviewIntervals();
  }

  protected bulkPreviewLabel(): string {
    return this.bulkPreviewIntervals()
      .map((interval) => `${interval.start_time}–${interval.end_time}`)
      .join(', ');
  }

  private refreshBulkPreview(): void {
    const { open_time, close_time, duration_hours } = this.bulkForm.getRawValue();
    this.bulkPreviewIntervals.set(
      buildBulkSlotIntervals(open_time, close_time, durationHoursToMinutes(duration_hours)),
    );
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async loadSlots(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const response = await firstValueFrom(
        this.clubsApi.listTimeSlots(this.data.clubId, this.data.courtId),
      );
      this.slots.set(response.time_slots);
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async createSlot(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(
        this.clubsApi.createTimeSlot(this.data.clubId, this.data.courtId, this.form.getRawValue()),
      );
      this.dialogRef.close('changed');
    } catch (error: unknown) {
      this.formError.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async bulkReplace(): Promise<void> {
    this.bulkForm.markAllAsTouched();
    if (this.bulkForm.invalid || this.selectedBulkDays().length === 0) {
      return;
    }

    const preview = this.bulkPreviewIntervals();
    if (preview.length === 0) {
      this.bulkError.set('CLUB_OWNER.TIME_SLOTS.BULK_NO_FIT');
      return;
    }

    this.isSaving.set(true);
    this.bulkError.set(null);
    try {
      const { open_time, close_time, duration_hours } = this.bulkForm.getRawValue();
      const response = await firstValueFrom(
        this.clubsApi.bulkCreateTimeSlots(this.data.clubId, this.data.courtId, {
          open_time,
          close_time,
          duration_minutes: durationHoursToMinutes(duration_hours),
          day_of_weeks: this.selectedBulkDays(),
        }),
      );
      this.slots.set(response.time_slots);
      this.data.onScheduleChanged?.();
    } catch (error: unknown) {
      this.bulkError.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async deleteSlot(slot: OwnerTimeSlot): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.clubsApi.deleteTimeSlot(this.data.clubId, this.data.courtId, slot.id),
      );
      this.dialogRef.close('changed');
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }
}
