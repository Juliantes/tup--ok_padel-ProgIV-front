import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';

import { routes } from './app.routes';
import { provideTranslateTesting } from './testing/translate-testing';
import { AuthService } from './login/auth.service';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            whenReady: () => of(undefined),
            authStateChanges$: EMPTY,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
