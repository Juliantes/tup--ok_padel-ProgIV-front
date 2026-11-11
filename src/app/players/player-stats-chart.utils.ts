export interface WinLossBarPercents {
  winsPercent: number;
  lossesPercent: number;
}

export function winLossBarPercents(wins: number, losses: number): WinLossBarPercents {
  const played = wins + losses;
  if (played <= 0) {
    return { winsPercent: 0, lossesPercent: 0 };
  }

  return {
    winsPercent: (wins / played) * 100,
    lossesPercent: (losses / played) * 100,
  };
}

export function formatWinRate(winRate: string | null | undefined): string | null {
  if (winRate == null || winRate === '') {
    return null;
  }

  const value = Number(winRate);
  if (Number.isNaN(value)) {
    return null;
  }

  return `${value.toFixed(0)}%`;
}
