import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { Court } from '../core/api/match.models';
import { OwnerClub } from '../core/api/club.models';
import { ClubsApiService } from '../core/api/clubs-api.service';
import { readApiErrorMessage, readApiFieldErrors } from '../core/api/api-errors';

@Component({
  selector: 'app-club-owner',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './club-owner.html',
  styleUrl: './club-owner.css',
})
export class ClubOwner implements OnInit {
  private readonly clubsApi = inject(ClubsApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly clubs = signal<OwnerClub[]>([]);
  protected readonly courts = signal<Court[]>([]);
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly selectedCourtId = signal<number | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showNewClubForm = signal(false);

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  protected readonly clubForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required] }),
    address: this.fb.control('', { validators: [Validators.required] }),
    phone: this.fb.control('', { validators: [Validators.required] }),
    email: this.fb.control(''),
  });

  protected readonly newClubForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required] }),
    address: this.fb.control('', { validators: [Validators.required] }),
    phone: this.fb.control('', { validators: [Validators.required] }),
    email: this.fb.control(''),
  });

  protected readonly courtForm = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required] }),
    court_type: this.fb.control<'indoor' | 'outdoor'>('indoor', {
      validators: [Validators.required],
    }),
    price_per_hour: this.fb.control(5000, { validators: [Validators.required, Validators.min(1)] }),
    description: this.fb.control(''),
    status: this.fb.control<'active' | 'maintenance' | 'inactive'>('active', {
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    void this.loadClubs();
  }

  protected selectClub(clubId: number): void {
    this.selectedClubId.set(clubId);
    this.selectedCourtId.set(null);
    this.patchClubForm();
    void this.loadCourts(clubId);
  }

  protected selectCourt(courtId: number): void {
    this.selectedCourtId.set(courtId);
    const court = this.courts().find((item) => item.id === courtId);
    if (!court) {
      return;
    }

    this.courtForm.patchValue({
      name: court.name,
      court_type: court.court_type as 'indoor' | 'outdoor',
      price_per_hour: court.price_per_hour,
      description: court.description ?? '',
      status: court.status as 'active' | 'maintenance' | 'inactive',
    });
    this.clearCourtFieldErrors();
  }

  protected startNewCourt(): void {
    this.selectedCourtId.set(null);
    this.courtForm.reset({
      name: '',
      court_type: 'indoor',
      price_per_hour: 5000,
      description: '',
      status: 'active',
    });
    this.clearCourtFieldErrors();
  }

  protected toggleNewClubForm(): void {
    this.showNewClubForm.update((value) => !value);
    this.newClubForm.reset({ name: '', address: '', phone: '', email: '' });
  }

  protected async saveClubDetails(): Promise<void> {
    const club = this.selectedClub();
    if (!club || this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }

    const raw = this.clubForm.getRawValue();
    await this.runAction(async () => {
      const response = await firstValueFrom(
        this.clubsApi.updateClub(club.id, {
          name: raw.name.trim(),
          address: raw.address.trim(),
          phone: raw.phone.trim(),
          email: raw.email.trim() || null,
        }),
      );
      this.upsertClub(response.club);
    });
  }

  protected async createClub(): Promise<void> {
    if (this.newClubForm.invalid) {
      this.newClubForm.markAllAsTouched();
      return;
    }

    const raw = this.newClubForm.getRawValue();
    await this.runAction(async () => {
      const response = await firstValueFrom(
        this.clubsApi.createClub({
          name: raw.name.trim(),
          address: raw.address.trim(),
          phone: raw.phone.trim(),
          email: raw.email.trim() || null,
        }),
      );
      this.upsertClub(response.club);
      this.showNewClubForm.set(false);
      this.selectClub(response.club.id);
    });
  }

  protected async saveCourt(): Promise<void> {
    const clubId = this.selectedClubId();
    if (!clubId || this.courtForm.invalid) {
      this.courtForm.markAllAsTouched();
      return;
    }

    const raw = this.courtForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      court_type: raw.court_type,
      price_per_hour: raw.price_per_hour,
      description: raw.description.trim() || null,
      status: raw.status,
    };

    const courtId = this.selectedCourtId();
    await this.runAction(async () => {
      if (courtId) {
        const response = await firstValueFrom(this.clubsApi.updateCourt(clubId, courtId, payload));
        this.replaceCourt(response.court);
      } else {
        const response = await firstValueFrom(this.clubsApi.createCourt(clubId, payload));
        this.courts.update((items) =>
          [...items, response.court].sort((a, b) => a.name.localeCompare(b.name)),
        );
        this.selectCourt(response.court.id);
      }
    }, true);
  }

  protected async deleteSelectedCourt(): Promise<void> {
    const clubId = this.selectedClubId();
    const courtId = this.selectedCourtId();
    if (!clubId || !courtId) {
      return;
    }

    await this.runAction(async () => {
      await firstValueFrom(this.clubsApi.deleteCourt(clubId, courtId));
      this.courts.update((items) => items.filter((item) => item.id !== courtId));
      this.startNewCourt();
    }, true);
  }

  private async loadClubs(): Promise<void> {
    await this.runAction(async () => {
      const response = await firstValueFrom(this.clubsApi.listClubs());
      this.clubs.set(response.clubs);
      if (response.clubs.length > 0) {
        this.selectClub(response.clubs[0].id);
      }
    });
  }

  private async loadCourts(clubId: number): Promise<void> {
    await this.runAction(async () => {
      const response = await firstValueFrom(this.clubsApi.listCourts(clubId));
      this.courts.set(response.courts);
      if (response.courts.length > 0) {
        this.selectCourt(response.courts[0].id);
      } else {
        this.startNewCourt();
      }
    });
  }

  private patchClubForm(): void {
    const club = this.selectedClub();
    if (!club) {
      return;
    }

    this.clubForm.patchValue({
      name: club.name,
      address: club.address,
      phone: club.phone,
      email: club.email ?? '',
    });
  }

  private upsertClub(club: OwnerClub): void {
    this.clubs.update((items) => {
      const next = items.filter((item) => item.id !== club.id);
      next.push(club);
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  private replaceCourt(court: Court): void {
    this.courts.update((items) => items.map((item) => (item.id === court.id ? court : item)));
  }

  private async runAction(action: () => Promise<void>, applyFieldErrors = false): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await action();
    } catch (error: unknown) {
      if (applyFieldErrors) {
        this.applyCourtErrors(error);
      } else {
        this.errorMessage.set(this.readErrorMessage(error));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyCourtErrors(error: unknown): void {
    const fieldErrors = readApiFieldErrors(error);
    if (fieldErrors) {
      Object.entries(fieldErrors).forEach(([key, messages]) => {
        const control = this.courtForm.get(key) as FormControl | null;
        if (control && messages.length > 0) {
          control.setErrors({ server: messages.join(', ') });
        }
      });
      return;
    }

    this.errorMessage.set(this.readErrorMessage(error));
  }

  private clearCourtFieldErrors(): void {
    Object.values(this.courtForm.controls).forEach((control) => {
      control.setErrors(null);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private readErrorMessage(error: unknown): string {
    return readApiErrorMessage(error);
  }
}
