import {
  buildCourtTimelineSegments,
  buildHourTicks,
  myBookingSlotKey,
  scheduleDayHoursRange,
  segmentLayout,
  timeToMinutes,
} from './player-schedule-timeline.utils';
import { PlayerAvailabilityCell } from '../core/api/club.models';

describe('player-schedule-timeline.utils', () => {
  it('converts times to minutes', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:00')).toBe(1380);
  });

  it('builds aligned day range from rows', () => {
    const range = scheduleDayHoursRange([
      { start_time: '09:00', end_time: '10:30' },
      { start_time: '10:30', end_time: '12:00' },
    ]);
    expect(range).toEqual({
      startMinutes: 9 * 60,
      endMinutes: 12 * 60,
      startLabel: '09:00',
      endLabel: '12:00',
    });
  });

  it('lays out segments as percentages of the range', () => {
    const range = scheduleDayHoursRange([{ start_time: '08:00', end_time: '10:00' }])!;
    expect(segmentLayout('08:00', '09:00', range)).toEqual({
      leftPercent: 0,
      widthPercent: 50,
    });
    expect(segmentLayout('09:00', '10:00', range)).toEqual({
      leftPercent: 50,
      widthPercent: 50,
    });
  });

  it('merges contiguous cells with the same kind', () => {
    const rows = [
      { start_time: '10:00', end_time: '11:00' },
      { start_time: '11:00', end_time: '12:00' },
    ];
    const range = scheduleDayHoursRange(rows)!;
    const cells = new Map<string, PlayerAvailabilityCell>([
      [
        '1:10:00',
        {
          court_id: 1,
          start_time: '10:00',
          state: 'available',
          time_slot_id: 5,
          end_time: '11:00',
        },
      ],
      [
        '1:11:00',
        {
          court_id: 1,
          start_time: '11:00',
          state: 'available',
          time_slot_id: 6,
          end_time: '12:00',
        },
      ],
    ]);

    const segments = buildCourtTimelineSegments(
      1,
      rows,
      range,
      (courtId, start) => cells.get(`${courtId}:${start}`),
      () => false,
      () => true,
    );

    expect(segments).toHaveLength(2);
    expect(segments[0]?.widthPercent).toBeCloseTo(50);
    expect(segments[1]?.widthPercent).toBeCloseTo(50);
  });

  it('marks mine separately from unavailable booked slots', () => {
    const rows = [{ start_time: '10:00', end_time: '11:30' }];
    const range = scheduleDayHoursRange(rows)!;
    const cell: PlayerAvailabilityCell = {
      court_id: 2,
      start_time: '10:00',
      state: 'booked',
      time_slot_id: 9,
      end_time: '11:30',
    };

    const mine = buildCourtTimelineSegments(
      2,
      rows,
      range,
      () => cell,
      () => true,
      () => false,
    );
    expect(mine[0]?.kind).toBe('mine');

    const other = buildCourtTimelineSegments(
      2,
      rows,
      range,
      () => cell,
      () => false,
      () => false,
    );
    expect(other[0]?.kind).toBe('booked');
  });

  it('links booked cells with match_id to match segments', () => {
    const rows = [{ start_time: '10:00', end_time: '11:30' }];
    const range = scheduleDayHoursRange(rows)!;
    const cell: PlayerAvailabilityCell = {
      court_id: 2,
      start_time: '10:00',
      state: 'booked',
      time_slot_id: 9,
      end_time: '11:30',
      match_id: 42,
    };

    const segments = buildCourtTimelineSegments(
      2,
      rows,
      range,
      () => cell,
      () => false,
      () => false,
    );
    expect(segments[0]?.kind).toBe('match');
    expect(segments[0]?.matchId).toBe(42);
  });

  it('builds hour ticks across the range', () => {
    const range = scheduleDayHoursRange([{ start_time: '08:30', end_time: '09:30' }])!;
    expect(buildHourTicks(range)).toEqual([8, 9, 10]);
  });

  it('builds stable booking slot keys', () => {
    expect(myBookingSlotKey(3, '2026-11-06', '14:00')).toBe('3:2026-11-06:14:00');
  });
});
