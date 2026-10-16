import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { ApiUser } from './api-user.model';

const STORAGE_KEY = 'ok-padel-api-session';

interface StoredApiSession {
  token: string;
  user: ApiUser;
}

@Injectable({
  providedIn: 'root',
})
export class ApiSessionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly session = signal<StoredApiSession | null>(this.readFromStorage());

  readonly apiUser = this.session;

  token(): string | null {
    return this.session()?.token ?? null;
  }

  user(): ApiUser | null {
    return this.session()?.user ?? null;
  }

  hasToken(): boolean {
    return this.token() !== null;
  }

  setSession(token: string, user: ApiUser): void {
    const next: StoredApiSession = { token, user };
    this.session.set(next);
    this.writeToStorage(next);
  }

  updateUser(user: ApiUser): void {
    const current = this.session();
    if (!current) {
      return;
    }

    this.setSession(current.token, user);
  }

  clear(): void {
    this.session.set(null);
    if (this.canUseStorage()) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private readFromStorage(): StoredApiSession | null {
    if (!this.canUseStorage()) {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredApiSession;
      if (!parsed.token || !parsed.user?.id) {
        return null;
      }

      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private writeToStorage(session: StoredApiSession): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }
}
