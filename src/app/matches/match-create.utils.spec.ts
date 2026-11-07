import {
  buildCreateMatchPayload,
  buildMatchDateIso,
  createSpotsSummary,
  truncateCompletedFrom,
} from './match-create.utils';

describe('match-create.utils', () => {
  it('builds ISO date from date and time', () => {
    const iso = buildMatchDateIso('2026-10-22', '18:30');
    expect(iso).toBe(new Date('2026-10-22T18:30:00').toISOString());
  });

  it('maps form values to create payload with court_id', () => {
    const payload = buildCreateMatchPayload({
      courtId: 7,
      date: '2026-10-22',
      time: '19:00',
      duration: 90,
      rosterMode: 'individual',
      levelRequired: 'fifth',
      autoJoin: true,
      joinPolicy: 'manual',
    });

    expect(payload).toEqual({
      court_id: 7,
      date: buildMatchDateIso('2026-10-22', '19:00'),
      duration: 90,
      roster_mode: 'individual',
      level_required: 'fifth',
      auto_join: true,
      join_policy: 'manual',
    });
    expect(payload).not.toHaveProperty('time_slot_id');
  });

  it('omits court_id when creating without a court', () => {
    const payload = buildCreateMatchPayload({
      courtId: null,
      date: '2026-10-22',
      time: '19:00',
      duration: 90,
      rosterMode: 'individual',
      levelRequired: 'fifth',
      autoJoin: true,
      joinPolicy: 'auto',
    });

    expect(payload).not.toHaveProperty('court_id');
  });

  it('includes time_slot_id when provided', () => {
    const payload = buildCreateMatchPayload({
      courtId: 3,
      timeSlotId: 99,
      date: '2026-10-22',
      time: '10:00',
      duration: 90,
      rosterMode: 'pairs',
      levelRequired: 'fifth',
      autoJoin: true,
      joinPolicy: 'auto',
    });

    expect(payload.time_slot_id).toBe(99);
  });

  it('summarizes roster spots when creator plays', () => {
    expect(createSpotsSummary(true)).toEqual({ filled: 1, missing: 3 });
    expect(createSpotsSummary(false)).toEqual({ filled: 0, missing: 4 });
  });

  it('truncates completed steps from edited step onward', () => {
    const completed = new Set(['place', 'date', 'play'] as const);
    const next = truncateCompletedFrom(completed, 'date');
    expect(next.has('place')).toBe(true);
    expect(next.has('date')).toBe(false);
    expect(next.has('play')).toBe(false);
  });
});
