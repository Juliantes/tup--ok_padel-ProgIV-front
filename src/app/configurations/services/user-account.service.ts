import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiSessionService } from '../../core/api/api-session.service';
import { ApiUser } from '../../core/api/api-user.model';
import { ProfileApiService, UpdateProfilePayload } from '../../core/api/profile-api.service';
import { EMPTY_USER_ACCOUNT_DETAILS, UserAccountDetails } from '../models/user-account.model';

const STORAGE_KEY_PREFIX = 'padel-match-user-account';

@Injectable({
  providedIn: 'root',
})
export class UserAccountService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly profileApi = inject(ProfileApiService);
  private readonly apiSession = inject(ApiSessionService);

  async loadApiProfile(): Promise<ApiUser> {
    const response = await firstValueFrom(this.profileApi.getProfile());
    this.apiSession.updateUser(response.user);
    return response.user;
  }

  async saveApiProfile(payload: UpdateProfilePayload): Promise<ApiUser> {
    const response = await firstValueFrom(this.profileApi.updateProfile(payload));
    this.apiSession.updateUser(response.user);
    return response.user;
  }

  getAccountDetails(userId: string): UserAccountDetails {
    const stored = this.readDetails(userId);
    if (!stored) {
      return { ...EMPTY_USER_ACCOUNT_DETAILS, phones: [''] };
    }

    return {
      birthDate: stored.birthDate,
      address: stored.address,
      phones: stored.phones.length > 0 ? stored.phones : [''],
    };
  }

  formatBirthDate(value: string | null): string {
    if (!value) {
      return '';
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return value;
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  }

  hasSavedPhones(phones: string[]): boolean {
    return this.getSavedPhones(phones).length > 0;
  }

  getSavedPhones(phones: string[]): string[] {
    return phones.map((phone) => phone.trim()).filter((phone) => phone.length > 0);
  }

  saveAccountDetails(userId: string, details: UserAccountDetails): void {
    if (!this.canUseStorage()) {
      return;
    }

    const normalized: UserAccountDetails = {
      birthDate: details.birthDate,
      address: details.address.trim(),
      phones: details.phones.map((phone) => phone.trim()).filter((phone) => phone.length > 0),
    };

    localStorage.setItem(this.storageKey(userId), JSON.stringify(normalized));
  }

  private readDetails(userId: string): UserAccountDetails | null {
    if (!this.canUseStorage()) {
      return null;
    }

    const rawValue = localStorage.getItem(this.storageKey(userId));
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as UserAccountDetails;
      if (
        typeof parsed.address !== 'string' ||
        !Array.isArray(parsed.phones) ||
        (parsed.birthDate !== null && typeof parsed.birthDate !== 'string')
      ) {
        this.clearAccountDetails(userId);
        return null;
      }

      return parsed;
    } catch {
      this.clearAccountDetails(userId);
      return null;
    }
  }

  private clearAccountDetails(userId: string): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.removeItem(this.storageKey(userId));
  }

  private storageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}:${userId}`;
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }
}
