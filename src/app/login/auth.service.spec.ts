import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ApiUser } from '../core/api/api-user.model';
import { ApiSessionService } from '../core/api/api-session.service';
import { AuthApiService } from '../core/api/auth-api.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { AuthService } from './auth.service';

describe('AuthService roles', () => {
  const session = signal<{ token: string; user: ApiUser } | null>(null);

  beforeEach(() => {
    session.set(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ...provideTranslateTesting(),
        {
          provide: ApiSessionService,
          useValue: {
            apiUser: session,
            user: () => session()?.user ?? null,
            hasToken: () => session() !== null,
            setSession: (token: string, user: ApiUser) => session.set({ token, user }),
            clear: () => session.set(null),
            updateUser: (user: ApiUser) => {
              const current = session();
              if (current) {
                session.set({ ...current, user });
              }
            },
          },
        },
        {
          provide: AuthApiService,
          useValue: {},
        },
      ],
    });
  });

  function service(): AuthService {
    return TestBed.inject(AuthService);
  }

  function buildUser(roles: ApiUser['roles']): ApiUser {
    return {
      id: 1,
      name: 'Test',
      email: 'test@example.com',
      phone: '1100000000',
      self_level: 4,
      category_label: '5ta',
      court_side: null,
      court_side_label: null,
      bio: null,
      average_level: null,
      average_stars: null,
      matches_played: 0,
      roles,
    };
  }

  it('detects club_owner role alone', () => {
    session.set({ token: 't', user: buildUser(['club_owner']) });
    expect(service().isClubOwner()).toBe(true);
    expect(service().isAdmin()).toBe(false);
    expect(service().isPlayer()).toBe(false);
  });

  it('supports multiple roles', () => {
    session.set({ token: 't', user: buildUser(['admin', 'player', 'club_owner']) });
    expect(service().isClubOwner()).toBe(true);
    expect(service().isAdmin()).toBe(true);
    expect(service().isPlayer()).toBe(true);
  });

  it('detects player only', () => {
    session.set({ token: 't', user: buildUser(['player']) });
    expect(service().isPlayer()).toBe(true);
    expect(service().isClubOwner()).toBe(false);
  });
});
