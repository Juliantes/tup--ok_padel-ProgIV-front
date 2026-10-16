import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';

import { AuthService } from '../../login/auth.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { UserAccountService } from '../services/user-account.service';
import { Account } from './account';

describe('Account', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ uid: 'test-user' }),
            userProfile: computed(() => ({
              name: 'Test User',
              email: 'test@example.com',
              image: 'assets/images/logout.jpg',
              memberSince: '1 de enero de 2025',
            })),
          },
        },
        {
          provide: UserAccountService,
          useValue: {
            getAccountDetails: () => ({
              birthDate: null,
              address: '',
              phones: [''],
            }),
            saveAccountDetails: () => void 0,
            formatBirthDate: (value: string | null) => value ?? '',
            hasSavedPhones: (phones: string[]) => phones.some((phone) => phone.trim().length > 0),
            getSavedPhones: (phones: string[]) =>
              phones.map((phone) => phone.trim()).filter((phone) => phone.length > 0),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
