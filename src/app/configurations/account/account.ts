import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { isPlaceholderApiPhone } from '../../core/api/api-base';
import { AuthService } from '../../login/auth.service';
import { UserAccountDetails } from '../models/user-account.model';
import { UserAccountService } from '../services/user-account.service';

@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly userAccountService = inject(UserAccountService);
  private readonly fb = inject(FormBuilder);

  protected readonly userProfile = computed(() => {
    const profile = this.auth.userProfile();
    const emptyValue = this.translate.instant('CONFIG.EMPTY_VALUE');

    return (
      profile ?? {
        name: emptyValue,
        email: emptyValue,
        image: 'assets/images/logout.jpg',
        memberSince: emptyValue,
      }
    );
  });

  protected readonly maxBirthDate = new Date();
  protected readonly accountDetails = signal<UserAccountDetails | null>(null);
  protected readonly apiPhonePlaceholder = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly isSaving = signal(false);

  private readonly phoneInvalidCharAttempt = new Map<AbstractControl, boolean>();

  private readonly phoneValidator = (control: AbstractControl): ValidationErrors | null => {
    if (this.phoneInvalidCharAttempt.get(control)) {
      return { invalidChars: true };
    }

    const raw = control.value as string;
    if (!raw) {
      return null;
    }

    if (!/^\d+$/.test(raw)) {
      return { invalidChars: true };
    }

    if (raw.length < 2) {
      return { phoneDigits: { actual: raw.length }, minlength: true };
    }

    if (raw.length > 15) {
      return { maxlength: { requiredLength: 15, actualLength: raw.length } };
    }

    return null;
  };

  protected readonly accountForm = this.fb.group({
    name: new FormControl('', { nonNullable: true }),
    selfLevel: new FormControl(3, { nonNullable: true }),
    bio: new FormControl('', { nonNullable: true }),
    birthDate: new FormControl<Date | null>(null),
    address: new FormControl('', { nonNullable: true }),
    phones: this.fb.array<FormControl<string>>([]),
  });

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      void this.router.navigate(['/login']);
      return;
    }

    const details = this.userAccountService.getAccountDetails(userId);
    this.accountDetails.set(details);
    this.patchForm(details);

    void this.loadApiProfile();
  }

  private async loadApiProfile(): Promise<void> {
    try {
      const profile = await this.userAccountService.loadApiProfile();
      this.accountForm.patchValue({
        name: profile.name,
        selfLevel: profile.self_level,
        bio: profile.bio ?? '',
      });

      const primaryPhone = profile.phone?.replace(/\D/g, '') ?? '';
      if (this.phones.length === 0) {
        this.phones.push(this.createPhoneControl(primaryPhone));
      } else {
        this.phones.at(0).setValue(primaryPhone);
      }

      this.apiPhonePlaceholder.set(isPlaceholderApiPhone(profile.phone));
    } catch (error) {
      console.warn('Could not load API profile:', error);
    }
  }

  protected formatBirthDate(value: string | null): string {
    return this.userAccountService.formatBirthDate(value);
  }

  protected hasSavedPhones(phones: string[]): boolean {
    return this.userAccountService.hasSavedPhones(phones);
  }

  protected getSavedPhones(phones: string[]): string[] {
    return this.userAccountService.getSavedPhones(phones);
  }

  protected get phones(): FormArray<FormControl<string>> {
    return this.accountForm.get('phones') as FormArray<FormControl<string>>;
  }

  protected addPhone(): void {
    this.phones.push(this.createPhoneControl());
  }

  protected removePhone(control: FormControl<string>): void {
    const index = this.phones.controls.indexOf(control);
    if (index >= 0 && this.phones.length > 1) {
      this.phones.removeAt(index);
    }
  }

  protected onPhoneKeyDown(event: KeyboardEvent, index: number): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key.length !== 1) {
      return;
    }

    if (!/\d/.test(event.key)) {
      event.preventDefault();
      const control = this.phones.at(index);
      this.phoneInvalidCharAttempt.set(control, true);
      control.updateValueAndValidity();
      control.markAsDirty();
      control.markAsTouched();
      return;
    }

    const control = this.phones.at(index);
    if (this.phoneInvalidCharAttempt.has(control)) {
      this.phoneInvalidCharAttempt.delete(control);
      control.updateValueAndValidity();
    }
  }

  protected onPhoneBlur(index: number): void {
    const control = this.phones.at(index);
    if (this.phoneInvalidCharAttempt.has(control)) {
      this.phoneInvalidCharAttempt.delete(control);
      control.updateValueAndValidity();
    }
  }

  protected onPhonePaste(event: ClipboardEvent, control: FormControl<string>): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digitsOnly = pasted.replace(/\D/g, '');

    if (pasted !== digitsOnly) {
      this.phoneInvalidCharAttempt.set(control, true);
    }

    const merged = `${control.value}${digitsOnly}`.slice(0, 15);
    control.setValue(merged);
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  protected getPhoneErrorMessage(control: FormControl<string>): string {
    if (control.hasError('invalidChars')) {
      return this.translate.instant('CONFIG.PHONE_INVALID_CHARS');
    }
    if (control.hasError('minlength') || control.hasError('phoneDigits')) {
      return this.translate.instant('CONFIG.PHONE_MIN_LENGTH');
    }
    if (control.hasError('maxlength')) {
      return this.translate.instant('CONFIG.PHONE_MAX_LENGTH');
    }
    return '';
  }

  protected async save(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId || this.accountForm.invalid || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const details: UserAccountDetails = {
      birthDate: this.toIsoDate(this.accountForm.controls.birthDate.value),
      address: this.accountForm.controls.address.value,
      phones: this.phones.controls.map((control) => control.value),
    };

    const primaryPhone = this.getSavedPhones(details.phones)[0] ?? '';

    try {
      const updated = await this.userAccountService.saveApiProfile({
        name: this.accountForm.controls.name.value.trim(),
        phone: primaryPhone,
        self_level: this.accountForm.controls.selfLevel.value,
        bio: this.accountForm.controls.bio.value.trim() || null,
      });

      this.apiPhonePlaceholder.set(isPlaceholderApiPhone(updated.phone));
      this.userAccountService.saveAccountDetails(userId, details);
      void this.router.navigate(['/configurations']);
    } catch (error) {
      console.error('Profile save failed:', error);
      this.saveError.set(this.translate.instant('CONFIG.FORM_INVALID'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private createPhoneControl(value = ''): FormControl<string> {
    return this.fb.control(value, {
      nonNullable: true,
      validators: [this.phoneValidator],
    });
  }

  private patchForm(details: UserAccountDetails): void {
    this.accountForm.patchValue({
      birthDate: this.fromIsoDate(details.birthDate),
      address: details.address,
    });

    this.phones.clear();
    const phones = details.phones.length > 0 ? details.phones : [''];
    for (const phone of phones) {
      this.phones.push(this.createPhoneControl(this.normalizePhone(phone)));
    }
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }

  private toIsoDate(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private fromIsoDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }
}
