import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { provideTranslateTesting } from '../testing/translate-testing';
import { ClubOwner } from './club-owner';

describe('ClubOwner', () => {
  let fixture: ComponentFixture<ClubOwner>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubOwner],
      providers: [provideHttpClient(), provideHttpClientTesting(), ...provideTranslateTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubOwner);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads clubs and courts for the selected club', async () => {
    fixture.detectChanges();

    const clubsReq = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs`);
    clubsReq.flush({
      clubs: [
        { id: 1, name: 'Alpha', address: 'A', phone: '1', email: null },
        { id: 2, name: 'Beta', address: 'B', phone: '2', email: null },
      ],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const courtsReq = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`);
    courtsReq.flush({
      courts: [
        {
          id: 10,
          name: 'Cancha 1',
          description: null,
          court_type: 'indoor',
          price_per_hour: 5000,
          status: 'active',
          club: { id: 1, name: 'Alpha', address: 'A' },
        },
      ],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alpha');
    expect(fixture.nativeElement.textContent).toContain('Cancha 1');
  });
});
