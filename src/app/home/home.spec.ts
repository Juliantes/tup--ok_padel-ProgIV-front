import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { provideTranslateTesting } from '../testing/translate-testing';
import { Home } from './home';

@Component({ standalone: true, template: '' })
class StubComponent {}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home, StubComponent],
      providers: [
        provideRouter([
          { path: 'matches', component: StubComponent },
          { path: 'configurations', component: StubComponent },
        ]),
        ...provideTranslateTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
