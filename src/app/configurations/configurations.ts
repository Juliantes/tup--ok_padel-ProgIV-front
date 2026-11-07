import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../login/auth.service';
import { isTauri } from '../core/platform';
import { UserAccountDetails } from './models/user-account.model';
import { UserAccountService } from './services/user-account.service';
import { CLUB_CARD_THEMES } from '../club/club-browse/club-browse.utils';
import { ClubsApiService } from '../core/api/clubs-api.service';
import { OwnerClub } from '../core/api/club.models';
import { readApiErrorMessage } from '../core/api/api-errors';

@Component({
  selector: 'app-configurations',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './configurations.html',
  styleUrls: ['./configurations.css'],
})
export class Configurations implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly userAccountService = inject(UserAccountService);
  private readonly clubsApi = inject(ClubsApiService);

  protected readonly accountDetails = signal<UserAccountDetails | null>(null);

  protected readonly roleLabels = computed(() => {
    const roles = this.auth.userRoles();
    const keys: Record<string, string> = {
      admin: 'ROLES.ADMIN',
      player: 'ROLES.PLAYER',
      club_owner: 'ROLES.CLUB_OWNER',
    };

    return roles.map((role) => keys[role]).filter((key): key is string => Boolean(key));
  });

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

  protected readonly appInfo = {
    version: '1.0.0',
    userAgent: navigator.userAgent,
  };

  protected readonly clubs = signal<OwnerClub[]>([]);
  protected readonly selectedClubId = signal<number | null>(null);
  protected readonly clubsLoading = signal(false);
  protected readonly clubsErrorMessage = signal<string | null>(null);
  protected readonly cardThemeSaving = signal(false);

  protected readonly cardThemes = CLUB_CARD_THEMES;

  protected readonly showClubCardTheme = computed(() => this.auth.isClubOwner());

  protected readonly selectedClub = computed(() => {
    const id = this.selectedClubId();
    return this.clubs().find((club) => club.id === id) ?? null;
  });

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    this.accountDetails.set(this.userAccountService.getAccountDetails(userId));
    void this.loadClubs();
  }

  protected onClubSelect(clubId: number): void {
    this.selectedClubId.set(clubId);
  }

  protected async selectCardTheme(theme: number): Promise<void> {
    const club = this.selectedClub();
    if (!club || club.card_theme === theme || this.cardThemeSaving()) {
      return;
    }

    this.cardThemeSaving.set(true);
    this.clubsErrorMessage.set(null);
    try {
      const response = await firstValueFrom(
        this.clubsApi.updateClub(club.id, { card_theme: theme }),
      );
      const updated = response.club;
      this.clubs.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error: unknown) {
      this.clubsErrorMessage.set(readApiErrorMessage(error));
    } finally {
      this.cardThemeSaving.set(false);
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

  protected openLogoutDialog(): void {
    void this.confirmLogout().then((confirmed) => {
      if (confirmed) {
        void this.logout();
      }
    });
  }

  private async confirmLogout(): Promise<boolean> {
    const message = this.translate.instant('CONFIG.LOGOUT_CONFIRM');

    if (isTauri()) {
      const { confirm: confirmDialog } = await import('@tauri-apps/plugin-dialog');
      return confirmDialog(message, { title: 'PadelMatch', kind: 'warning' });
    }

    return confirm(message);
  }

  protected async logout(): Promise<void> {
    const loggedOut = firstValueFrom(
      this.auth.authStateChanges$.pipe(
        filter((user) => user === null),
        take(1),
      ),
    );

    await this.auth.signOut();
    await loggedOut;
    await this.router.navigate(['/login']);
  }

  private async loadClubs(): Promise<void> {
    if (!this.auth.isClubOwner()) {
      return;
    }

    this.clubsLoading.set(true);
    this.clubsErrorMessage.set(null);
    try {
      const response = await firstValueFrom(this.clubsApi.listClubs());
      this.clubs.set(response.clubs);
      if (response.clubs.length > 0) {
        const currentId = this.selectedClubId();
        const stillValid = currentId !== null && response.clubs.some((c) => c.id === currentId);
        this.selectedClubId.set(stillValid ? currentId : response.clubs[0].id);
      } else {
        this.selectedClubId.set(null);
      }
    } catch (error: unknown) {
      this.clubsErrorMessage.set(readApiErrorMessage(error));
    } finally {
      this.clubsLoading.set(false);
    }
  }
}
