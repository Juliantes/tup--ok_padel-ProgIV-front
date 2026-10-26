import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../login/auth.service';
import { isTauri } from '../core/platform';
import { UserAccountDetails } from './models/user-account.model';
import { UserAccountService } from './services/user-account.service';

@Component({
  selector: 'app-configurations',
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './configurations.html',
  styleUrls: ['./configurations.css'],
})
export class Configurations implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly userAccountService = inject(UserAccountService);

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

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    this.accountDetails.set(this.userAccountService.getAccountDetails(userId));
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
}
