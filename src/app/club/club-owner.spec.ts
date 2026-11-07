import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../environments/environment';
import { provideTranslateTesting } from '../testing/translate-testing';
import { ClubOwner } from './club-owner';
import { CourtFormDialog } from './court-form-dialog/court-form-dialog';
import { TimeSlotsPanel } from './time-slots-panel/time-slots-panel';
import { todayIsoDate } from './club-schedule.utils';

describe('ClubOwner', () => {
  let fixture: ComponentFixture<ClubOwner>;
  let http: HttpTestingController;
  let dialogOpen: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubOwner],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        ...provideTranslateTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubOwner);
    http = TestBed.inject(HttpTestingController);
    dialogOpen = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => ({ subscribe: () => undefined }),
    } as never);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  async function flushInitialSchedule(): Promise<void> {
    fixture.detectChanges();

    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs`).flush({
      clubs: [
        {
          id: 1,
          name: 'Ok Padel Club',
          address: 'Av. Test 123',
          phone: '1144556677',
          email: null,
          card_theme: 0,
        },
        {
          id: 2,
          name: 'Segundo Club',
          address: 'Calle 2',
          phone: '1144556688',
          email: null,
          card_theme: 1,
        },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance['enterClub'](1);
    await fixture.whenStable();

    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`).flush({
      courts: [
        {
          id: 10,
          name: 'Cancha 1',
          description: null,
          court_type: 'indoor',
          price_per_hour: 8000,
          status: 'active',
          color: 0,
          club: { id: 1, name: 'Ok Padel Club', address: 'Av. Test 123' },
        },
      ],
    });
    await fixture.whenStable();

    http
      .expectOne((req) =>
        req.urlWithParams.startsWith(`${environment.apiBaseUrl}/api/v1/clubs/1/schedule`),
      )
      .flush({
        club: {
          id: 1,
          name: 'Ok Padel Club',
          address: 'Av. Test 123',
          phone: '1144556677',
          email: null,
          card_theme: 0,
        },
        date: todayIsoDate(),
        courts: [{ id: 10, name: 'Cancha 1', price_per_hour: 8000, status: 'active', color: 0 }],
        rows: [{ start_time: '10:00', end_time: '11:30' }],
        cells: [
          {
            court_id: 10,
            start_time: '10:00',
            state: 'available',
            time_slot_id: 5,
            end_time: '11:30',
            match_id: null,
          },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads schedule grid for the first club', async () => {
    await flushInitialSchedule();
    expect(fixture.nativeElement.textContent).toContain('Ok Padel Club');
    expect(fixture.nativeElement.textContent).toContain('CLUB_OWNER.RESERVE');
  });

  it('reloads schedule when switching clubs', async () => {
    await flushInitialSchedule();

    fixture.componentInstance['selectClub'](2);
    await fixture.whenStable();

    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/2/courts`).flush({ courts: [] });
    await fixture.whenStable();

    http
      .expectOne((req) => req.urlWithParams.includes('/api/v1/clubs/2/schedule'))
      .flush({
        club: { id: 2, name: 'Segundo Club', address: 'Calle 2', phone: '1144556688', email: null },
        date: todayIsoDate(),
        courts: [],
        rows: [],
        cells: [],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CLUB_OWNER.NO_COURTS_IN_CLUB');
  });

  it('shows empty courts message when club has no courts', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs`).flush({
      clubs: [{ id: 1, name: 'Solo', address: 'A', phone: '1', email: null }],
    });
    await fixture.whenStable();
    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`).flush({ courts: [] });
    await fixture.whenStable();
    http
      .expectOne((req) => req.urlWithParams.includes('/api/v1/clubs/1/schedule'))
      .flush({
        club: { id: 1, name: 'Solo', address: 'A', phone: '1', email: null },
        date: todayIsoDate(),
        courts: [],
        rows: [],
        cells: [],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CLUB_OWNER.NO_COURTS_IN_CLUB');
  });

  it('opens walk-in dialog instead of whatsapp on available cells', async () => {
    await flushInitialSchedule();
    const reserveBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.slot-btn--available');
    reserveBtn?.click();
    expect(dialogOpen).toHaveBeenCalled();
  });

  it('shows liberar action on walk-in booked cells without reserve CTA', async () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs`).flush({
      clubs: [
        { id: 1, name: 'Ok Padel Club', address: 'Av. Test 123', phone: '1144556677', email: null },
      ],
    });
    await fixture.whenStable();
    http.expectOne(`${environment.apiBaseUrl}/api/v1/clubs/1/courts`).flush({
      courts: [
        {
          id: 10,
          name: 'Cancha 1',
          description: null,
          court_type: 'indoor',
          price_per_hour: 8000,
          status: 'active',
          color: 0,
          club: { id: 1, name: 'Ok Padel Club', address: 'Av. Test 123' },
        },
      ],
    });
    await fixture.whenStable();
    http
      .expectOne((req) => req.urlWithParams.includes('/api/v1/clubs/1/schedule'))
      .flush({
        club: {
          id: 1,
          name: 'Ok Padel Club',
          address: 'Av. Test 123',
          phone: '1144556677',
          email: null,
          card_theme: 0,
        },
        date: todayIsoDate(),
        courts: [{ id: 10, name: 'Cancha 1', price_per_hour: 8000, status: 'active', color: 0 }],
        rows: [{ start_time: '10:00', end_time: '11:30' }],
        cells: [
          {
            court_id: 10,
            start_time: '10:00',
            state: 'booked',
            time_slot_id: 5,
            end_time: '11:30',
            match_id: 99,
            walk_in: true,
          },
        ],
      });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.slot-btn--available')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('CLUB_OWNER.CANCEL.ACTION');
  });

  it('opens court form in edit mode from court pill', async () => {
    await flushInitialSchedule();
    dialogOpen.mockClear();

    const editBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.court-pill__edit');
    editBtn?.click();

    expect(dialogOpen).toHaveBeenCalledWith(
      CourtFormDialog,
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: 1,
          court: expect.objectContaining({ id: 10, name: 'Cancha 1', court_type: 'indoor' }),
        }),
      }),
    );
  });

  it('opens time slots panel from court pill main action', async () => {
    await flushInitialSchedule();
    dialogOpen.mockClear();

    const mainBtn: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.court-pill__main');
    mainBtn?.click();

    expect(dialogOpen).toHaveBeenCalledWith(
      TimeSlotsPanel,
      expect.objectContaining({
        data: expect.objectContaining({ clubId: 1, courtId: 10 }),
      }),
    );
  });
});
