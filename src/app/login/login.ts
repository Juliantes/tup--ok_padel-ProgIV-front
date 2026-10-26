import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from './auth.service';

type LoginView = 'signin' | 'signup' | 'verification' | 'reset';

const FIREBASE_ERROR_KEYS: Record<string, string> = {
  'email-already-in-use': 'LOGIN.ERROR_EMAIL_IN_USE',
  'invalid-email': 'LOGIN.ERROR_INVALID_EMAIL',
  'wrong-password': 'LOGIN.ERROR_WRONG_PASSWORD',
  'invalid-credential': 'LOGIN.ERROR_WRONG_PASSWORD',
  'weak-password': 'LOGIN.ERROR_WEAK_PASSWORD',
  'too-many-requests': 'LOGIN.ERROR_TOO_MANY_REQUESTS',
  'email-not-verified': 'LOGIN.ERROR_EMAIL_NOT_VERIFIED',
  'operation-not-allowed': 'LOGIN.ERROR_OPERATION_NOT_ALLOWED',
  'user-not-found': 'LOGIN.ERROR_USER_NOT_FOUND',
};

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  if (!password || !confirm) {
    return null;
  }

  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  protected readonly view = signal<LoginView>('signin');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);

  protected readonly signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly signUpForm = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly resetForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected setView(next: LoginView): void {
    this.view.set(next);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }

  protected async submitSignIn(): Promise<void> {
    if (this.signInForm.invalid || this.isLoading()) {
      this.signInForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.signInForm.getRawValue();
    await this.runAuthAction(async () => {
      try {
        await this.authService.signInWithEmail(email, password);
      } catch (error: unknown) {
        if (this.isEmailNotVerifiedError(error)) {
          this.view.set('verification');
          this.infoMessage.set(this.translate.instant('LOGIN.VERIFICATION_PENDING'));
          return;
        }
        throw error;
      }

      const sessionOk = await this.authService.ensureRailsSession();
      if (!sessionOk) {
        throw new Error('api/session-exchange-failed');
      }

      await this.router.navigateByUrl('/home', { replaceUrl: true });
    });
  }

  protected async submitSignUp(): Promise<void> {
    if (this.signUpForm.invalid || this.isLoading()) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.signUpForm.getRawValue();
    await this.runAuthAction(async () => {
      await this.authService.signUpWithEmail(email, password);
      this.infoMessage.set(this.translate.instant('LOGIN.VERIFICATION_SENT'));
      this.view.set('verification');
    });
  }

  protected async resendVerification(): Promise<void> {
    await this.runAuthAction(async () => {
      await this.authService.resendVerificationEmail();
      this.infoMessage.set(this.translate.instant('LOGIN.VERIFICATION_RESENT'));
    });
  }

  protected async confirmVerification(): Promise<void> {
    await this.runAuthAction(async () => {
      const sessionOk = await this.authService.completeEmailVerification();
      if (!sessionOk) {
        const error = new Error('Email not verified') as Error & { code: string };
        error.code = 'auth/email-not-verified';
        throw error;
      }

      await this.router.navigateByUrl('/home', { replaceUrl: true });
    });
  }

  protected async submitPasswordReset(): Promise<void> {
    if (this.resetForm.invalid || this.isLoading()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { email } = this.resetForm.getRawValue();
    await this.runAuthAction(async () => {
      await this.authService.sendPasswordReset(email);
      this.infoMessage.set(this.translate.instant('LOGIN.RESET_EMAIL_SENT'));
      this.view.set('signin');
    });
  }

  protected async signInWithGoogle(): Promise<void> {
    await this.runAuthAction(async () => {
      await this.authService.signInWithGoogle();
      const sessionOk = await this.authService.ensureRailsSession();
      if (!sessionOk) {
        throw new Error('api/session-exchange-failed');
      }

      await this.router.navigateByUrl('/home', { replaceUrl: true });
    });
  }

  private async runAuthAction(action: () => Promise<void>): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    try {
      await action();
    } catch (error: unknown) {
      console.error('Login error:', error);
      this.errorMessage.set(this.resolveErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private isEmailNotVerifiedError(error: unknown): boolean {
    const code = this.extractErrorCode(error);
    return code === 'email-not-verified';
  }

  private extractErrorCode(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as { code: string }).code).replace(/^auth\//, '');
    }

    if (error instanceof Error) {
      return error.message.replace(/^auth\//, '');
    }

    return '';
  }

  private resolveErrorMessage(error: unknown): string {
    const code = this.extractErrorCode(error);
    const i18nKey = FIREBASE_ERROR_KEYS[code];
    if (i18nKey) {
      return this.translate.instant(i18nKey);
    }

    if (code === 'api/session-exchange-failed') {
      return this.translate.instant('LOGIN.ERROR_SESSION_EXCHANGE');
    }

    return code
      ? this.translate.instant('LOGIN.ERROR_WITH_CODE', { code })
      : this.translate.instant('LOGIN.ERROR_GENERIC');
  }
}
