import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../environments/environment';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { TimeSlotsPanel } from './time-slots-panel';

describe('TimeSlotsPanel', () => {
  let fixture: ComponentFixture<TimeSlotsPanel>;
  let http: HttpTestingController;
  const dialogRef = { close: vi.fn() };

  beforeEach(async () => {
    dialogRef.close.mockReset();
    await TestBed.configureTestingModule({
      imports: [TimeSlotsPanel],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { clubId: 1, courtId: 10, courtName: 'Cancha 1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsPanel);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists slots on open', async () => {
    fixture.detectChanges();
    const listReq = http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots`);
    listReq.flush({
      time_slots: [
        {
          id: 1,
          court_id: 10,
          day_of_week: 1,
          start_time: '10:00',
          end_time: '11:30',
          is_available: true,
        },
      ],
    });
    await fixture.whenStable();
    expect(fixture.componentInstance['slots']().length).toBe(1);
  });

  it('shows server error on overlapping slot without closing', async () => {
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots`)
      .flush({ time_slots: [] });
    await fixture.whenStable();

    void fixture.componentInstance['createSlot']();
    const createReq = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots`,
    );
    createReq.flush(
      { error: 'unprocessable_entity', errors: { base: ['overlapping'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['formError']()).toBeTruthy();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('bulk replace reloads list and notifies schedule without closing', async () => {
    const onScheduleChanged = vi.fn();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TimeSlotsPanel],
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
            onScheduleChanged,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsPanel);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http
      .expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots`)
      .flush({ time_slots: [] });
    await fixture.whenStable();

    void fixture.componentInstance['bulkReplace']();
    const bulkReq = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots/bulk`,
    );
    expect(bulkReq.request.body).toMatchObject({
      open_time: '08:00',
      close_time: '23:00',
      duration_minutes: 90,
      day_of_weeks: [1, 2, 3, 4, 5],
    });
    bulkReq.flush({
      time_slots: [
        {
          id: 2,
          court_id: 10,
          day_of_week: 1,
          start_time: '08:00',
          end_time: '09:30',
          is_available: true,
        },
      ],
    });
    await fixture.whenStable();

    expect(fixture.componentInstance['slots']().length).toBe(1);
    expect(onScheduleChanged).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
