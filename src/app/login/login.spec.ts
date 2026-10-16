import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';

import { routes } from '../app.routes';
import { provideTranslateTesting } from '../testing/translate-testing';
import { AuthService } from './auth.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
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
            isAuthenticated: () => true,
            signInWithGoogle: () => Promise.resolve(),
            ensureRailsSession: () => Promise.resolve(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
