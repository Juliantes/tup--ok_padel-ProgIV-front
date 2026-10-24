import { describe, expect, it } from 'vitest';

import {
  applyReportGameDelta,
  buildReportResultSets,
  canIncrementReportGame,
  canSubmitMatchReport,
  createEmptyReportSets,
  isReportSet3Enabled,
  isValidPadelSetScore,
  maxGamesForReportSide,
} from './match-report.utils';

describe('match-report.utils', () => {
  it('validates completed padel set scores (6 con ventaja, 7-5, 7-6)', () => {
    expect(isValidPadelSetScore(6, 4)).toBe(true);
    expect(isValidPadelSetScore(6, 0)).toBe(true);
    expect(isValidPadelSetScore(7, 5)).toBe(true);
    expect(isValidPadelSetScore(7, 6)).toBe(true);
    expect(isValidPadelSetScore(0, 0)).toBe(false);
    expect(isValidPadelSetScore(6, 5)).toBe(false);
    expect(isValidPadelSetScore(7, 4)).toBe(false);
    expect(isValidPadelSetScore(8, 6)).toBe(false);
  });

  it('caps stepper: no 7 si el rival tiene menos de 5', () => {
    expect(maxGamesForReportSide({ teamA: 6, teamB: 4 }, 'teamA')).toBe(6);
    expect(canIncrementReportGame({ teamA: 6, teamB: 4 }, 'teamA')).toBe(false);

    let set = { teamA: 6, teamB: 3 };
    set = applyReportGameDelta(set, 'teamA', 1);
    expect(set.teamA).toBe(6);

    set = { teamA: 5, teamB: 5 };
    expect(maxGamesForReportSide(set, 'teamA')).toBe(7);
    set = applyReportGameDelta(set, 'teamA', 1);
    expect(set).toEqual({ teamA: 6, teamB: 5 });
    set = applyReportGameDelta(set, 'teamA', 1);
    expect(set).toEqual({ teamA: 7, teamB: 5 });
    expect(isValidPadelSetScore(set.teamA, set.teamB)).toBe(true);
  });

  it('enables set 3 only on 1-1 after valid first two sets', () => {
    expect(isReportSet3Enabled({ teamA: 6, teamB: 4 }, { teamA: 4, teamB: 6 })).toBe(true);
    expect(isReportSet3Enabled({ teamA: 6, teamB: 4 }, { teamA: 6, teamB: 3 })).toBe(false);
    expect(isReportSet3Enabled({ teamA: 0, teamB: 0 }, { teamA: 0, teamB: 0 })).toBe(false);
  });

  it('builds payload with two or three sets', () => {
    const sets = [
      { teamA: 6, teamB: 4 },
      { teamA: 6, teamB: 3 },
      { teamA: 0, teamB: 0 },
    ];
    expect(buildReportResultSets(sets, false)).toHaveLength(2);
    expect(buildReportResultSets(sets, true)).toHaveLength(3);
  });

  it('accepts a valid 2-0 or 2-1 report', () => {
    const twoZero = createEmptyReportSets();
    twoZero[0] = { teamA: 6, teamB: 4 };
    twoZero[1] = { teamA: 6, teamB: 3 };
    expect(canSubmitMatchReport(twoZero, false)).toBe(true);

    const twoOne = createEmptyReportSets();
    twoOne[0] = { teamA: 6, teamB: 4 };
    twoOne[1] = { teamA: 3, teamB: 6 };
    twoOne[2] = { teamA: 6, teamB: 2 };
    expect(canSubmitMatchReport(twoOne, true)).toBe(true);
    expect(canSubmitMatchReport(twoOne, false)).toBe(false);
  });
});
