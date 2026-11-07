import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { signal } from '@angular/core';

import { AuthService } from '../login/auth.service';
import { provideTranslateTesting } from '../testing/translate-testing';
import { Header } from './header';

@Component({ standalone: true, template: '' })
class StubComponent {}

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  const userRoles = signal<('player' | 'club_owner' | 'admin')[]>([]);

  beforeEach(async () => {
    userRoles.set([]);

    await TestBed.configureTestingModule({
      imports: [Header, StubComponent],
      providers: [
        provideRouter([{ path: '**', component: StubComponent }]),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            userRoles: () => userRoles(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows Mis canchas nav only for club owners', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('NAV.CLUB');

    userRoles.set(['club_owner']);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NAV.CLUB');
  });

  it('shows Canchas nav only for players', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('NAV.COURTS');

    userRoles.set(['player']);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NAV.COURTS');
  });
});
