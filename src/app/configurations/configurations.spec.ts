import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { EMPTY, of } from 'rxjs';

import { AuthService } from '../login/auth.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { UserAccountService } from './services/user-account.service';
import { Configurations } from './configurations';

describe('Configurations', () => {
  let component: Configurations;
  let fixture: ComponentFixture<Configurations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Configurations],
      providers: [
        provideRouter([]),
        ...provideTranslateTesting(),
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
});
