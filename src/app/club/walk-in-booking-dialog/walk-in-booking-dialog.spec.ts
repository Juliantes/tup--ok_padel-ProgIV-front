import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../environments/environment';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { WalkInBookingDialog } from './walk-in-booking-dialog';

describe('WalkInBookingDialog', () => {
  let fixture: ComponentFixture<WalkInBookingDialog>;
  let http: HttpTestingController;
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    dialogRef.close.mockReset();
    await TestBed.configureTestingModule({
      imports: [WalkInBookingDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            clubId: 1,
            courtId: 10,
            courtName: 'Cancha 1',
            timeSlotId: 5,
            date: '2026-11-04',
            startTime: '10:00',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WalkInBookingDialog);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('closes without API call on cancel', () => {
    fixture.detectChanges();
    fixture.componentInstance['close']();
    expect(dialogRef.close).toHaveBeenCalledWith();
    expect(http.match(`${environment.apiBaseUrl}/api/v1/clubs/1/walk_in_bookings`).length).toBe(0);
  });

  it('posts walk-in booking with optional guest fields', async () => {
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({
      walk_in_guest_name: 'Ana',
      walk_in_guest_phone: '+54911',
    });
    void fixture.componentInstance['confirm']();

    const req = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/walk_in_bookings`);
    expect(req.request.body).toEqual({
      court_id: 10,
      time_slot_id: 5,
      date: '2026-11-04',
      walk_in_guest_name: 'Ana',
      walk_in_guest_phone: '+54911',
    });
    req.flush({
      match: { id: 1, court_id: 10, time_slot_id: 5, date: '2026-11-04', status: 'confirmed' },
    });
    await fixture.whenStable();
    expect(dialogRef.close).toHaveBeenCalledWith('confirmed');
  });
});
