import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../login/auth.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { PlayersStateService } from './services/players-state.service';
import { Users } from './users';

describe('Users', () => {
  let component: Users;
  let fixture: ComponentFixture<Users>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Users],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            isAdmin: signal(false),
            ensureRailsSession: () => Promise.resolve(true),
          },
        },
        {
          provide: PlayersStateService,
          useValue: {
            getPlayers: () => of([]),
            refreshPlayers: () => of([]),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
