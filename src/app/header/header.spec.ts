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

  const isClubOwner = signal(false);

  beforeEach(async () => {
    isClubOwner.set(false);

    await TestBed.configureTestingModule({
      imports: [Header, StubComponent],
      providers: [
        provideRouter([{ path: '**', component: StubComponent }]),
        ...provideTranslateTesting(),
        {
          provide: AuthService,
          useValue: {
            isClubOwner: () => isClubOwner(),
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

    isClubOwner.set(true);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('NAV.CLUB');
  });
});
