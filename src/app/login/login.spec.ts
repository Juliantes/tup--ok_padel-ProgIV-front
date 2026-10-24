import { provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';

import { routes } from '../app.routes';
import { provideTranslateTesting } from '../testing/translate-testing';
import { AuthService } from './auth.service';
import { Login } from './login';

type LoginHarness = Login & {
  view: () => string;
  signUpForm: Login['signUpForm'];
  signInForm: Login['signInForm'];
  submitSignUp: () => Promise<void>;
  submitSignIn: () => Promise<void>;
};

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let harness: LoginHarness;
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  let signUpWithEmail: ReturnType<typeof vi.fn>;
  let signInWithEmail: ReturnType<typeof vi.fn>;
  let ensureRailsSession: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    signUpWithEmail = vi.fn().mockResolvedValue(undefined);
    signInWithEmail = vi.fn().mockResolvedValue(undefined);
    ensureRailsSession = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter(routes),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            whenReady: () => of(void 0),
            authStateChanges$: EMPTY,
            isAuthenticated: () => false,
            signInWithGoogle: () => Promise.resolve(),
            signUpWithEmail,
            signInWithEmail,
            resendVerificationEmail: () => Promise.resolve(),
            completeEmailVerification: () => Promise.resolve(true),
            sendPasswordReset: () => Promise.resolve(),
            ensureRailsSession,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    harness = component as LoginHarness;
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('switches to verification after sign up without navigating home', async () => {
    harness.signUpForm.setValue({
      email: 'player@example.com',
      password: 'secret12',
      confirmPassword: 'secret12',
    });

    await harness.submitSignUp();

    expect(signUpWithEmail).toHaveBeenCalledWith('player@example.com', 'secret12');
    expect(harness.view()).toBe('verification');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates home after verified email sign in', async () => {
    harness.signInForm.setValue({
      email: 'player@example.com',
      password: 'secret12',
    });

    await harness.submitSignIn();

    expect(signInWithEmail).toHaveBeenCalledWith('player@example.com', 'secret12');
    expect(ensureRailsSession).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/home', { replaceUrl: true });
  });

  it('shows verification view when email is not verified on sign in', async () => {
    signInWithEmail.mockRejectedValue({ code: 'auth/email-not-verified' });
    harness.signInForm.setValue({
      email: 'player@example.com',
      password: 'secret12',
    });

    await harness.submitSignIn();

    expect(harness.view()).toBe('verification');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
