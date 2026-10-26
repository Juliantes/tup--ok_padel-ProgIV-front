import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AuthService } from './auth.service';
import { clubOwnerGuard } from './club-owner.guard';

describe('clubOwnerGuard', () => {
  const isClubOwner = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'home', redirectTo: '' }]),
        {
          provide: AuthService,
          useValue: {
            isClubOwner: () => isClubOwner(),
          },
        },
      ],
    });
  });

  it('allows club owners', () => {
    isClubOwner.set(true);
    const result = TestBed.runInInjectionContext(() => clubOwnerGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects non-owners to home', () => {
    isClubOwner.set(false);
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => clubOwnerGuard({} as never, {} as never));
    expect(result).toEqual(router.createUrlTree(['/home']));
  });
});
