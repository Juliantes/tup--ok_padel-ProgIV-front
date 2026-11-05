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

export interface TimeSlotsPanelData {
  clubId: number;
  courtId: number;
  courtName: string;
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

  protected readonly form = this.fb.nonNullable.group({
    day_of_week: [1, Validators.required],
    start_time: ['10:00', Validators.required],
    end_time: ['11:30', Validators.required],
    is_available: [true],
  });

  ngOnInit(): void {
    void this.loadSlots();
  }

  protected weekdayLabel(index: number): string {
    return WEEKDAY_KEYS[index];
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
