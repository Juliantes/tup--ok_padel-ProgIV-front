import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readApiErrorMessage } from '../../core/api/api-errors';
import { ClubsApiService } from '../../core/api/clubs-api.service';

export interface WalkInBookingDialogData {
  clubId: number;
  courtId: number;
  courtName: string;
  timeSlotId: number;
  date: string;
  startTime: string;
}

export type WalkInBookingDialogResult = 'confirmed';

@Component({
  selector: 'app-walk-in-booking-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './walk-in-booking-dialog.html',
  styleUrl: './walk-in-booking-dialog.css',
})
export class WalkInBookingDialog {
  private readonly dialogRef =
    inject<MatDialogRef<WalkInBookingDialog, WalkInBookingDialogResult | undefined>>(MatDialogRef);
  protected readonly data = inject<WalkInBookingDialogData>(MAT_DIALOG_DATA);
  private readonly clubsApi = inject(ClubsApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    walk_in_guest_name: [''],
    walk_in_guest_phone: [''],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async confirm(): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.clubsApi.createWalkInBooking(this.data.clubId, {
          court_id: this.data.courtId,
          time_slot_id: this.data.timeSlotId,
          date: this.data.date,
          walk_in_guest_name: raw.walk_in_guest_name?.trim() || null,
          walk_in_guest_phone: raw.walk_in_guest_phone?.trim() || null,
        }),
      );
      this.dialogRef.close('confirmed');
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }
}
