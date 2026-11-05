import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readApiErrorMessage } from '../../core/api/api-errors';
import {
  OwnerDayOverrideSlotPayload,
  OwnerTimeSlot,
  ScheduleDateOption,
} from '../../core/api/club.models';
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
  initialDate: string;
  dateOptions: ScheduleDateOption[];
  onScheduleChanged?: () => void;
}

export type TimeSlotsPanelResult = 'changed';

type PanelView = 'home' | 'editDay' | 'bulk';
type EditStep = 'date' | 'scope' | 'editor';
type EditScope = 'once' | 'weekly';

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
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

@Component({
  selector: 'app-time-slots-panel',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
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
  protected readonly panelView = signal<PanelView>('home');
  protected readonly editStep = signal<EditStep>('date');
  protected readonly editScope = signal<EditScope | null>(null);
  protected readonly selectedDateIso = signal<string | null>(null);
  protected readonly slots = signal<OwnerTimeSlot[]>([]);
  protected readonly draftSlots = signal<OwnerDayOverrideSlotPayload[]>([]);
  protected readonly dateCustomized = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly bulkError = signal<string | null>(null);
  protected readonly selectedBulkDays = signal<number[]>([...WEEKDAYS_MON_FRI]);

  protected readonly form = this.fb.nonNullable.group({
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
    this.refreshBulkPreview();
    this.bulkForm.valueChanges.subscribe(() => this.refreshBulkPreview());
  }

  protected weekdayLabel(index: number): string {
    return WEEKDAY_KEYS[index];
  }

  protected selectedDateOption(): ScheduleDateOption | undefined {
    const iso = this.selectedDateIso();
    return this.data.dateOptions.find((option) => option.isoDate === iso);
  }

  protected selectedDayOfWeek(): number | null {
    const iso = this.selectedDateIso();
    if (!iso) {
      return null;
    }
    return new Date(`${iso}T12:00:00`).getDay();
  }

  protected goHome(): void {
    this.panelView.set('home');
    this.editStep.set('date');
    this.editScope.set(null);
    this.errorMessage.set(null);
    this.formError.set(null);
    this.bulkError.set(null);
  }

  protected startEditDay(): void {
    this.panelView.set('editDay');
    this.editStep.set('date');
    this.selectedDateIso.set(this.data.initialDate);
    this.editScope.set(null);
  }

  protected startBulk(): void {
    this.panelView.set('bulk');
    this.bulkError.set(null);
  }

  protected pickDate(isoDate: string): void {
    this.selectedDateIso.set(isoDate);
    this.editStep.set('scope');
    this.editScope.set(null);
  }

  protected pickScope(scope: EditScope): void {
    this.editScope.set(scope);
    this.editStep.set('editor');
    void this.loadEditor();
  }

  protected backEditStep(): void {
    const step = this.editStep();
    if (step === 'editor') {
      this.editStep.set('scope');
      this.editScope.set(null);
      return;
    }
    if (step === 'scope') {
      this.editStep.set('date');
      return;
    }
    this.goHome();
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

  protected selectAllWeekdays(): void {
    this.selectedBulkDays.set([...ALL_WEEKDAYS]);
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

  private async loadEditor(): Promise<void> {
    const scope = this.editScope();
    const iso = this.selectedDateIso();
    if (!scope || !iso) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.formError.set(null);
    try {
      if (scope === 'once') {
        const response = await firstValueFrom(
          this.clubsApi.listTimeSlotsForDate(this.data.clubId, this.data.courtId, iso),
        );
        this.dateCustomized.set(response.customized);
        this.slots.set(response.time_slots);
        this.draftSlots.set(
          response.time_slots.map((slot) => ({
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_available: slot.is_available,
          })),
        );
      } else {
        const response = await firstValueFrom(
          this.clubsApi.listTimeSlots(this.data.clubId, this.data.courtId),
        );
        const day = this.selectedDayOfWeek();
        const filtered = response.time_slots.filter((slot) => slot.day_of_week === day);
        this.slots.set(filtered);
        this.draftSlots.set([]);
      }
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected addDraftSlot(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.draftSlots.set([...this.draftSlots(), value]);
    this.formError.set(null);
  }

  protected removeDraftSlot(index: number): void {
    this.draftSlots.set(this.draftSlots().filter((_, i) => i !== index));
  }

  protected async saveDayOverride(): Promise<void> {
    const iso = this.selectedDateIso();
    if (!iso) {
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      const response = await firstValueFrom(
        this.clubsApi.replaceDayOverride(this.data.clubId, this.data.courtId, {
          date: iso,
          slots: this.draftSlots(),
        }),
      );
      this.dateCustomized.set(response.customized);
      this.slots.set(response.time_slots);
      this.data.onScheduleChanged?.();
    } catch (error: unknown) {
      this.formError.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async clearDayOverride(): Promise<void> {
    const iso = this.selectedDateIso();
    if (!iso) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.clubsApi.clearDayOverride(this.data.clubId, this.data.courtId, iso),
      );
      this.dateCustomized.set(false);
      await this.loadEditor();
      this.data.onScheduleChanged?.();
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async createWeeklySlot(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const day = this.selectedDayOfWeek();
    if (day === null) {
      return;
    }

    this.isSaving.set(true);
    this.formError.set(null);
    try {
      await firstValueFrom(
        this.clubsApi.createTimeSlot(this.data.clubId, this.data.courtId, {
          day_of_week: day,
          ...this.form.getRawValue(),
        }),
      );
      await this.loadEditor();
      this.data.onScheduleChanged?.();
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
      await firstValueFrom(
        this.clubsApi.bulkCreateTimeSlots(this.data.clubId, this.data.courtId, {
          open_time,
          close_time,
          duration_minutes: durationHoursToMinutes(duration_hours),
          day_of_weeks: this.selectedBulkDays(),
        }),
      );
      this.data.onScheduleChanged?.();
      this.goHome();
    } catch (error: unknown) {
      this.bulkError.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async deleteWeeklySlot(slot: OwnerTimeSlot): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.clubsApi.deleteTimeSlot(this.data.clubId, this.data.courtId, slot.id),
      );
      await this.loadEditor();
      this.data.onScheduleChanged?.();
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }
}
