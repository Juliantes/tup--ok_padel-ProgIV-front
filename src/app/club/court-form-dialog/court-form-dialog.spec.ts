import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../environments/environment';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { Court } from '../../core/api/match.models';
import { CourtFormDialog } from './court-form-dialog';

describe('CourtFormDialog', () => {
  let fixture: ComponentFixture<CourtFormDialog>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourtFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: { clubId: 1 } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CourtFormDialog);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('requires court name before save', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance['save']();
    expect(http.match(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`).length).toBe(0);
  });

  it('creates a court on valid submit', async () => {
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({
      name: 'Cancha 3',
      court_type: 'indoor',
      price_per_hour: 5000,
      status: 'active',
      color: 2,
    });
    void fixture.componentInstance['save']();

    const req = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(expect.objectContaining({ color: 2 }));
    req.flush({
      court: {
        id: 3,
        name: 'Cancha 3',
        court_type: 'indoor',
        price_per_hour: 5000,
        status: 'active',
        description: null,
        color: 2,
        club: { id: 1, name: 'Club', address: 'Addr' },
      },
    });
    await fixture.whenStable();
  });

  it('updates when editing an existing court', async () => {
    const court: Court = {
      id: 10,
      name: 'Cancha 1',
      description: null,
      court_type: 'outdoor',
      price_per_hour: 7000,
      status: 'active',
      color: 1,
      club: { id: 1, name: 'Club', address: 'Addr' },
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CourtFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: { clubId: 1, court } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CourtFormDialog);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    void fixture.componentInstance['save']();

    const req = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(expect.objectContaining({ color: 1 }));
    req.flush({ court });
    await fixture.whenStable();
  });
});
