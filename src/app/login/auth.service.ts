import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Observable,
  ReplaySubject,
  Subject,
  filter,
  firstValueFrom,
  map,
  take,
  timeout,
} from 'rxjs';

import { TranslateService } from '@ngx-translate/core';
import * as Sentry from '@sentry/angular';

import { environment } from '../../environments/environment';
import { ApiSessionService } from '../core/api/api-session.service';
import { AuthApiService } from '../core/api/auth-api.service';
import { isTauri } from '../core/platform';

export type AppUserRole = 'player' | 'admin' | 'club_owner';

export interface UserProfile {
  name: string;
  email: string;
  image: string;
  memberSince: string;
}

const DEFAULT_PROFILE_IMAGE = 'assets/images/logout.jpg';
const AUTH_STATE_TIMEOUT_MS = 10_000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly authApi = inject(AuthApiService);
  private readonly apiSession = inject(ApiSessionService);
  private readonly auth: Auth | null;
  private readonly ready$ = new ReplaySubject<void>(1);
  private readonly authEvents$ = new Subject<User | null>();
  private authInitialized = false;
  private railsExchangeInFlight: Promise<boolean> | null = null;

  readonly authStateChanges$ = this.authEvents$.asObservable();
  readonly currentUser = signal<User | null>(null);
  readonly apiUser = computed(() => this.apiSession.user());
  readonly isLogged = computed(() => this.apiSession.hasToken());
  readonly userRoles = computed(() => this.apiSession.user()?.roles ?? []);
  readonly isAdmin = computed(() => this.userRoles().includes('admin'));
  readonly isPlayer = computed(() => this.userRoles().includes('player'));
  readonly isClubOwner = computed(() => this.userRoles().includes('club_owner'));

  readonly userProfile = computed<UserProfile | null>(() => {
    const apiUser = this.apiSession.user();
    const firebaseUser = this.currentUser();

    if (!apiUser && !firebaseUser) {
      return null;
    }

    return {
      name:
        apiUser?.name ?? firebaseUser?.displayName ?? this.translate.instant('AUTH.DEFAULT_USER'),
      email: apiUser?.email ?? firebaseUser?.email ?? '',
      image: firebaseUser?.photoURL ?? DEFAULT_PROFILE_IMAGE,
      memberSince: this.formatMemberSince(firebaseUser?.metadata.creationTime),
    };
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      this.auth = null;
      this.ready$.next();
      this.ready$.complete();
      return;
    }

    const app: FirebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.auth = this.createAuth(app);

    onAuthStateChanged(this.auth, (user) => {
      void this.handleAuthStateChange(user);
      if (!this.authInitialized) {
        this.authInitialized = true;
        this.ready$.next();
        this.ready$.complete();
      }
    });
  }

  whenReady(): Observable<void> {
    return this.ready$.pipe(
      take(1),
      map(() => void 0),
    );
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = this.auth?.currentUser;
    if (!user) {
      return null;
    }

    return user.getIdToken(forceRefresh);
  }

  async ensureRailsSession(): Promise<boolean> {
    if (this.apiSession.hasToken()) {
      return true;
    }

    if (!this.auth?.currentUser) {
      return false;
    }

    return this.exchangeFirebaseForRailsSession();
  }

  async refreshRailsSession(): Promise<boolean> {
    if (!this.auth?.currentUser) {
      return false;
    }

    return this.exchangeFirebaseForRailsSession(true);
  }

  isAuthenticated(): boolean {
    return this.apiSession.hasToken();
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.auth) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      if (!idToken) {
        throw new Error('auth/missing-id-token');
      }

      const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
      const { user } = await signInWithCredential(this.auth, credential);
      this.currentUser.set(user ?? this.auth.currentUser);
      this.authEvents$.next(user ?? this.auth.currentUser);
      await this.exchangeFirebaseForRailsSession();
      return;
    }

    if (isTauri()) {
      const { signInWithGoogleViaSystemBrowser } = await import('./tauri-google-auth');
      const clientId = environment.googleDesktopClientId.trim();
      const clientSecret = environment.googleDesktopClientSecret.trim();
      const tokens = await signInWithGoogleViaSystemBrowser(clientId, clientSecret);
      const credential = GoogleAuthProvider.credential(
        tokens.idToken ?? null,
        tokens.accessToken || null,
      );
      const { user } = await signInWithCredential(this.auth, credential);
      this.currentUser.set(user ?? this.auth.currentUser);
      this.authEvents$.next(user ?? this.auth.currentUser);
      await this.exchangeFirebaseForRailsSession();
      return;
    }

    const provider = new GoogleAuthProvider();
    const signedIn = this.waitForAuthState((user) => user !== null);
    await signInWithPopup(this.auth, provider);
    await signedIn;
    await this.exchangeFirebaseForRailsSession();
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    if (!this.auth) {
      return;
    }

    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    this.publishFirebaseUser(user);
    await sendEmailVerification(user);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    if (!this.auth) {
      return;
    }

    const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
    this.publishFirebaseUser(user);

    if (!user.emailVerified) {
      const error = new Error('Email not verified') as Error & { code: string };
      error.code = 'auth/email-not-verified';
      throw error;
    }

    await this.exchangeFirebaseForRailsSession();
  }

  async resendVerificationEmail(): Promise<void> {
    const user = this.auth?.currentUser;
    if (!user) {
      throw new Error('auth/no-current-user');
    }

    await sendEmailVerification(user);
  }

  async completeEmailVerification(): Promise<boolean> {
    const user = this.auth?.currentUser;
    if (!user) {
      return false;
    }

    await reload(user);
    this.publishFirebaseUser(this.auth!.currentUser);

    if (!user.emailVerified) {
      return false;
    }

    return this.exchangeFirebaseForRailsSession(true);
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (!this.auth) {
      return;
    }

    await sendPasswordResetEmail(this.auth, email.trim());
  }

  async signOut(): Promise<void> {
    this.apiSession.clear();
    if (!this.auth) {
      this.currentUser.set(null);
      return;
    }

    const signedOut = isTauri() ? undefined : this.waitForAuthState((user) => user === null);

    if (Capacitor.isNativePlatform()) {
      await FirebaseAuthentication.signOut();
    }
    await signOut(this.auth);

    if (isTauri()) {
      this.publishFirebaseUser(null);
    } else {
      await signedOut;
    }
  }

  private async handleAuthStateChange(user: User | null): Promise<void> {
    this.publishFirebaseUser(user);

    if (!user) {
      this.apiSession.clear();
      return;
    }

    if (!this.apiSession.hasToken() && this.canExchangeRailsSession(user)) {
      await this.exchangeFirebaseForRailsSession();
    }
  }

  private canExchangeRailsSession(user: User): boolean {
    return user.emailVerified;
  }

  private async exchangeFirebaseForRailsSession(forceRefresh = false): Promise<boolean> {
    if (this.railsExchangeInFlight) {
      return this.railsExchangeInFlight;
    }

    this.railsExchangeInFlight = this.performRailsExchange(forceRefresh).finally(() => {
      this.railsExchangeInFlight = null;
    });

    return this.railsExchangeInFlight;
  }

  private async performRailsExchange(forceRefresh: boolean): Promise<boolean> {
    const firebaseUser = this.auth?.currentUser;
    if (firebaseUser && !this.canExchangeRailsSession(firebaseUser)) {
      return false;
    }

    const idToken = await this.getIdToken(forceRefresh);
    if (!idToken) {
      return false;
    }

    try {
      const response = await firstValueFrom(this.authApi.exchangeFirebaseToken(idToken));
      this.apiSession.setSession(response.token, response.user);
      return true;
    } catch (error) {
      console.warn('Rails session exchange failed:', error);
      return false;
    }
  }

  private createAuth(app: FirebaseApp): Auth {
    if (Capacitor.isNativePlatform() || isTauri()) {
      try {
        return initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        });
      } catch {
        return getAuth(app);
      }
    }

    return getAuth(app);
  }

  private publishFirebaseUser(user: User | null): void {
    this.currentUser.set(user);
    this.authEvents$.next(user);
    this.syncSentryUser(user);
  }

  private waitForAuthState(predicate: (user: User | null) => boolean): Promise<void> {
    return firstValueFrom(
      this.authEvents$.pipe(
        filter(predicate),
        take(1),
        timeout(AUTH_STATE_TIMEOUT_MS),
        map(() => void 0),
      ),
    );
  }

  private syncSentryUser(user: User | null): void {
    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: user.uid,
      email: user.email ?? undefined,
      username: user.displayName ?? undefined,
    });
  }

  private formatMemberSince(creationTime: string | undefined): string {
    const emptyValue = this.translate.instant('CONFIG.EMPTY_VALUE');

    if (!creationTime) {
      return emptyValue;
    }

    const parsedDate = new Date(creationTime);
    if (Number.isNaN(parsedDate.getTime())) {
      return emptyValue;
    }

    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsedDate);
  }
}
