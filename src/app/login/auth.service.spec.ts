import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ApiUser } from '../core/api/api-user.model';
import { ApiSessionService } from '../core/api/api-session.service';
import { AuthApiService } from '../core/api/auth-api.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { AuthService } from './auth.service';

describe('AuthService roles', () => {
  const apiUser = signal<ApiUser | null>(null);

  beforeEach(() => {
    apiUser.set(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ...provideTranslateTesting(),
        {
          provide: ApiSessionService,
          useValue: {
            user: () => apiUser(),
            hasToken: () => apiUser() !== null,
            setSession: (_token: string, user: ApiUser) => apiUser.set(user),
            clear: () => apiUser.set(null),
            updateUser: (user: ApiUser) => apiUser.set(user),
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
    apiUser.set(buildUser(['club_owner']));
    expect(service().isClubOwner()).toBe(true);
    expect(service().isAdmin()).toBe(false);
    expect(service().isPlayer()).toBe(false);
  });

  it('supports multiple roles', () => {
    apiUser.set(buildUser(['admin', 'player', 'club_owner']));
    expect(service().isClubOwner()).toBe(true);
    expect(service().isAdmin()).toBe(true);
    expect(service().isPlayer()).toBe(true);
  });

  it('detects player only', () => {
    apiUser.set(buildUser(['player']));
    expect(service().isPlayer()).toBe(true);
    expect(service().isClubOwner()).toBe(false);
  });
});
