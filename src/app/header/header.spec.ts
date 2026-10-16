import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { provideTranslateTesting } from '../testing/translate-testing';
import { Header } from './header';

@Component({ standalone: true, template: '' })
class StubComponent {}

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header, StubComponent],
      providers: [
        provideRouter([{ path: '**', component: StubComponent }]),
        ...provideTranslateTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
