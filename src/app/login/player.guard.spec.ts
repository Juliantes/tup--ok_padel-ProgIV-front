import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { AuthService } from './auth.service';
import { playerGuard } from './player.guard';

describe('playerGuard', () => {
  const isPlayer = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'home', redirectTo: '' }]),
        {
          provide: AuthService,
          useValue: {
            isPlayer: () => isPlayer(),
          },
        },
      ],
    });
  });

  it('allows players', () => {
    isPlayer.set(true);
    const result = TestBed.runInInjectionContext(() => playerGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects non-players to home', () => {
    isPlayer.set(false);
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => playerGuard({} as never, {} as never));
    expect(result).toEqual(router.createUrlTree(['/home']));
  });
});
