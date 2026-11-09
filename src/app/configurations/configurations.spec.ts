import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { EMPTY, of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';

import { AuthService } from '../login/auth.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { UserAccountService } from './services/user-account.service';
import { Configurations } from './configurations';
import { ClubsApiService } from '../core/api/clubs-api.service';

describe('Configurations', () => {
  let component: Configurations;
  let fixture: ComponentFixture<Configurations>;
  const isClubOwnerSignal = signal(true);
  let updateClubSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isClubOwnerSignal.set(true);
    updateClubSpy = vi.fn((id: number, payload: Record<string, unknown>) =>
      of({
        club: {
          id,
          name: 'Club A',
          address: payload['address'] ?? 'Av. 1',
          country: payload['country'] ?? null,
          province: payload['province'] ?? null,
          city: payload['city'] ?? null,
          lat: payload['lat'] ?? null,
          lng: payload['lng'] ?? null,
          place_id: payload['place_id'] ?? null,
          phone: '111',
          email: null,
          card_theme: payload['card_theme'] ?? 0,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [Configurations],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        {
          provide: ClubsApiService,
          useValue: {
            listClubs: () =>
              of({
                clubs: [
                  {
                    id: 1,
                    name: 'Club A',
                    address: 'Av. 1',
                    country: null,
                    province: null,
                    city: null,
                    phone: '111',
                    email: null,
                    card_theme: 0,
                  },
                  {
                    id: 2,
                    name: 'Club B',
                    address: 'Av. 2',
                    country: null,
                    province: null,
                    city: null,
                    phone: '222',
                    email: null,
                    card_theme: 1,
                  },
                ],
              }),
            updateClub: updateClubSpy,
          },
        },
        {
          provide: AuthService,
          useValue: {
            whenReady: () => of(void 0),
            authStateChanges$: EMPTY,
            currentUser: signal({ uid: 'test-user' }),
            userProfile: computed(() => ({
              name: 'Test User',
              email: 'test@example.com',
              image: 'assets/images/logout.jpg',
              memberSince: '1 de enero de 2025',
            })),
            isLogged: signal(false),
            userRoles: signal(['club_owner']),
            isClubOwner: () => isClubOwnerSignal(),
            signOut: () => Promise.resolve(),
          },
        },
        {
          provide: UserAccountService,
          useValue: {
            getAccountDetails: () => ({
              birthDate: '1990-05-15',
              address: 'Av. Siempre Viva 742',
              phones: ['1122334455'],
            }),
            formatBirthDate: (value: string | null) => value ?? '',
            hasSavedPhones: (phones: string[]) => phones.some((phone) => phone.trim().length > 0),
            getSavedPhones: (phones: string[]) =>
              phones.map((phone) => phone.trim()).filter((phone) => phone.length > 0),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Configurations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render edit profile button', () => {
    const editButton = fixture.nativeElement.querySelector('.edit-profile-button');
    expect(editButton).toBeTruthy();
  });

  it('renders role chips for club_owner', () => {
    fixture.detectChanges();
    const chips = fixture.nativeElement.querySelectorAll('.role-chip');
    expect(chips.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('ROLES.CLUB_OWNER');
  });

  it('hides club card theme block when user is not a club owner', async () => {
    isClubOwnerSignal.set(false);
    fixture = TestBed.createComponent(Configurations);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.club-card-theme-card')).toBeNull();
  });

  it('shows club card theme controls for club owner with clubs', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CONFIG.CLUB_CARD_THEME.TITLE');
    const swatches = fixture.nativeElement.querySelectorAll('.club-card-theme__swatch');
    expect(swatches.length).toBe(5);
  });

  it('saves structured location through updateClub', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    const exposed = component as unknown as {
      selectSuggestion: (suggestion: {
        formatted: string;
        address: string;
        country: string;
        province: string;
        city: string;
        lat: number;
        lng: number;
        place_id: string;
      }) => void;
      saveClubLocation: () => Promise<void>;
    };
    exposed.selectSuggestion({
      formatted: 'Calle 1, Rosario, Argentina',
      address: 'Calle 1, Rosario, Argentina',
      country: 'Argentina',
      province: 'Santa Fe',
      city: 'Rosario',
      lat: -32.95,
      lng: -60.67,
      place_id: 'place-rosario',
    });
    await exposed.saveClubLocation();
    expect(updateClubSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        address: 'Calle 1, Rosario, Argentina',
        country: 'Argentina',
        province: 'Santa Fe',
        city: 'Rosario',
        lat: -32.95,
        lng: -60.67,
        place_id: 'place-rosario',
      }),
    );
  });
});
