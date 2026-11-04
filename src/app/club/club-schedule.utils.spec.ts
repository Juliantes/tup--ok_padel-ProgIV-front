import { buildScheduleDateOptions, scheduleCellKey, todayIsoDate } from './club-schedule.utils';

describe('club-schedule.utils', () => {
  it('marks the first option as today when starting from today', () => {
    const options = buildScheduleDateOptions(3, todayIsoDate());
    expect(options[0]?.isToday).toBe(true);
    expect(options[1]?.isToday).toBe(false);
  });

  it('builds stable cell keys', () => {
    expect(scheduleCellKey(3, '10:00')).toBe('3:10:00');
  });
});
