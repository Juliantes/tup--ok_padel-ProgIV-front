import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected async signIn(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithGoogle();
      const sessionOk = await this.authService.ensureRailsSession();
      if (!sessionOk) {
        throw new Error('api/session-exchange-failed');
      }

      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : error instanceof Error
            ? error.message.replace(/^auth\//, '')
            : '';
      console.error('Error al iniciar sesión con Google:', error);
      this.errorMessage.set(
        code
          ? this.translate.instant('LOGIN.ERROR_WITH_CODE', { code })
          : this.translate.instant('LOGIN.ERROR_GENERIC'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
