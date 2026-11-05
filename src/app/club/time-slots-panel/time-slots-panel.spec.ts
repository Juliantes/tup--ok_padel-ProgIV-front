import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../environments/environment';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { buildScheduleDateOptions } from '../club-schedule.utils';
import { TimeSlotsPanel } from './time-slots-panel';

const panelData = {
  clubId: 1,
  courtId: 10,
  courtName: 'Cancha 1',
  initialDate: '2026-11-10',
  dateOptions: buildScheduleDateOptions(3, '2026-11-10'),
};

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
        { provide: MAT_DIALOG_DATA, useValue: panelData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsPanel);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('shows home actions without loading slots', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance['panelView']()).toBe('home');
    http.expectNone(`${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots`);
  });

  it('saves a day override from draft slots', async () => {
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
          useValue: { ...panelData, onScheduleChanged },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsPanel);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    fixture.componentInstance['startEditDay']();
    fixture.componentInstance['pickDate']('2026-11-10');
    fixture.componentInstance['pickScope']('once');
    const listReq = http.expectOne(
      (req) =>
        req.url === `${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots` &&
        req.params.get('date') === '2026-11-10',
    );
    listReq.flush({
      date: '2026-11-10',
      day_of_week: 1,
      customized: false,
      time_slots: [],
    });
    await fixture.whenStable();

    fixture.componentInstance['draftSlots'].set([
      { start_time: '09:00', end_time: '10:30', is_available: true },
    ]);
    void fixture.componentInstance['saveDayOverride']();
    const saveReq = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/clubs/1/courts/10/time_slots/day_override`,
    );
    expect(saveReq.request.method).toBe('PUT');
    expect(saveReq.request.body).toEqual({
      date: '2026-11-10',
      slots: [{ start_time: '09:00', end_time: '10:30', is_available: true }],
    });
    saveReq.flush({
      date: '2026-11-10',
      day_of_week: 1,
      customized: true,
      time_slots: [
        {
          id: 7,
          court_id: 10,
          day_of_week: 1,
          effective_on: '2026-11-10',
          start_time: '09:00',
          end_time: '10:30',
          is_available: true,
        },
      ],
    });
    await fixture.whenStable();

    expect(onScheduleChanged).toHaveBeenCalled();
    expect(fixture.componentInstance['dateCustomized']()).toBe(true);
  });

  it('bulk replace notifies schedule and returns home', async () => {
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
          useValue: { ...panelData, onScheduleChanged },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeSlotsPanel);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    fixture.componentInstance['startBulk']();
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
    bulkReq.flush({ time_slots: [] });
    await fixture.whenStable();

    expect(onScheduleChanged).toHaveBeenCalled();
    expect(fixture.componentInstance['panelView']()).toBe('home');
  });
});
