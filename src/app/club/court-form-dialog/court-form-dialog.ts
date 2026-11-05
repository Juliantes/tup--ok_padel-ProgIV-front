import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readApiErrorMessage } from '../../core/api/api-errors';
import { OwnerCourtPayload } from '../../core/api/club.models';
import { Court } from '../../core/api/match.models';
import { ClubsApiService } from '../../core/api/clubs-api.service';

export interface CourtFormDialogData {
  clubId: number;
  court?: Court;
}

export type CourtFormDialogResult = 'saved' | 'deleted';

@Component({
  selector: 'app-court-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './court-form-dialog.html',
  styleUrl: './court-form-dialog.css',
})
export class CourtFormDialog {
  private readonly dialogRef = inject(
    MatDialogRef<CourtFormDialog, CourtFormDialogResult | undefined>,
  );
  protected readonly data = inject<CourtFormDialogData>(MAT_DIALOG_DATA);
  private readonly clubsApi = inject(ClubsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isEdit = !!this.data.court;

  protected readonly form = this.fb.nonNullable.group({
    name: [this.data.court?.name ?? '', Validators.required],
    court_type: [this.data.court?.court_type ?? 'indoor', Validators.required],
    price_per_hour: [
      this.data.court?.price_per_hour ?? 0,
      [Validators.required, Validators.min(1)],
    ],
    status: [this.data.court?.status ?? 'active', Validators.required],
    description: [this.data.court?.description ?? ''],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const payload: OwnerCourtPayload = {
      name: raw.name.trim(),
      court_type: raw.court_type as OwnerCourtPayload['court_type'],
      price_per_hour: Number(raw.price_per_hour),
      status: raw.status as OwnerCourtPayload['status'],
      description: raw.description.trim() || null,
    };

    try {
      if (this.isEdit && this.data.court) {
        await firstValueFrom(
          this.clubsApi.updateCourt(this.data.clubId, this.data.court.id, payload),
        );
      } else {
        await firstValueFrom(this.clubsApi.createCourt(this.data.clubId, payload));
      }
      this.dialogRef.close('saved');
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async deleteCourt(): Promise<void> {
    if (!this.isEdit || !this.data.court) {
      return;
    }

    const confirmed = window.confirm(
      this.translate.instant('CLUB_OWNER.COURT_FORM.DELETE_CONFIRM'),
    );
    if (!confirmed) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.clubsApi.deleteCourt(this.data.clubId, this.data.court.id));
      this.dialogRef.close('deleted');
    } catch (error: unknown) {
      this.errorMessage.set(readApiErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }
}
