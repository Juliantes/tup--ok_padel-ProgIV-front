import { describe, expect, it } from 'vitest';

import {
  buildReportResultSets,
  canSubmitMatchReport,
  createEmptyReportSets,
  isReportSet3Enabled,
  isValidPadelSetScore,
} from './match-report.utils';

describe('match-report.utils', () => {
  it('validates padel set scores like the API', () => {
    expect(isValidPadelSetScore(6, 4)).toBe(true);
    expect(isValidPadelSetScore(7, 5)).toBe(true);
    expect(isValidPadelSetScore(0, 0)).toBe(false);
    expect(isValidPadelSetScore(6, 5)).toBe(false);
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
