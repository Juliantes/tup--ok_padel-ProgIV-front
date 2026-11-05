import { describe, expect, it } from 'vitest';

import { buildBulkSlotIntervals, durationHoursToMinutes } from './time-slot-bulk.utils';

describe('buildBulkSlotIntervals', () => {
  it('generates ten 90-minute slots from 08:00 to 23:00', () => {
    const intervals = buildBulkSlotIntervals('08:00', '23:00', 90);
    expect(intervals).toHaveLength(10);
    expect(intervals[0]).toEqual({ start_time: '08:00', end_time: '09:30' });
    expect(intervals[9]).toEqual({ start_time: '21:30', end_time: '23:00' });
  });

  it('drops partial remainder', () => {
    const intervals = buildBulkSlotIntervals('08:00', '22:00', 90);
    expect(intervals).toHaveLength(9);
    expect(intervals[8]).toEqual({ start_time: '20:00', end_time: '21:30' });
  });

  it('returns empty when duration does not fit', () => {
    expect(buildBulkSlotIntervals('08:00', '08:30', 90)).toEqual([]);
  });
});

describe('durationHoursToMinutes', () => {
  it('converts fractional hours', () => {
    expect(durationHoursToMinutes(1.5)).toBe(90);
  });
});
