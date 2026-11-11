import { describe, expect, it } from 'vitest';

import { winLossBarPercents } from './player-stats-chart.utils';

describe('winLossBarPercents', () => {
  it('splits wins and losses across played matches', () => {
    expect(winLossBarPercents(5, 3)).toEqual({ winsPercent: 62.5, lossesPercent: 37.5 });
  });

  it('returns zeros when no matches were played', () => {
    expect(winLossBarPercents(0, 0)).toEqual({ winsPercent: 0, lossesPercent: 0 });
  });
});
