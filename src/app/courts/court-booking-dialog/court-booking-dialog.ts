import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readApiErrorMessage } from '../../core/api/api-errors';
import { CourtBookingsApiService } from '../../core/api/court-bookings-api.service';
import { formatClubPrice } from '../../club/club-schedule.utils';

export interface CourtBookingDialogData {
  clubId: number;
  clubName: string;
  courtId: number;
  courtName: string;
  timeSlotId: number;
  date: string;
  startTime: string;
  endTime: string | null;
  pricePerHour: number;
  durationMinutes: number;
}

export type CourtBookingDialogResult = 'confirmed';

@Component({
  selector: 'app-court-booking-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslatePipe],
  templateUrl: './court-booking-dialog.html',
  styleUrl: './court-booking-dialog.css',
})
export class CourtBookingDialog {
  private readonly dialogRef =
    inject<MatDialogRef<CourtBookingDialog, CourtBookingDialogResult | undefined>>(MatDialogRef);
  protected readonly data = inject<CourtBookingDialogData>(MAT_DIALOG_DATA);
  private readonly courtBookingsApi = inject(CourtBookingsApiService);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected estimatedTotal(): string {
    const total = (this.data.pricePerHour * this.data.durationMinutes) / 60;
    return formatClubPrice(total);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async confirm(): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.courtBookingsApi.createCourtBooking({
          club_id: this.data.clubId,
          court_id: this.data.courtId,
          time_slot_id: this.data.timeSlotId,
          date: this.data.date,
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
