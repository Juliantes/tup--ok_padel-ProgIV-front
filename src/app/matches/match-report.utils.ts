export interface ReportSetGames {
  teamA: number;
  teamB: number;
}

export const REPORT_SET_COUNT = 3;
/** Máximo de juegos por lado en un set (6 con ventaja o 7-5 / 7-6). */
export const REPORT_SET_GAMES_MAX = 7;

export type ReportSetSide = 'teamA' | 'teamB';

export function isValidPadelSetScore(teamA: number, teamB: number): boolean {
  if (teamA === teamB) {
    return false;
  }

  const winner = Math.max(teamA, teamB);
  const loser = Math.min(teamA, teamB);

  if (winner > REPORT_SET_GAMES_MAX) {
    return false;
  }

  if (winner === 6 && loser <= 4) {
    return true;
  }
  if (winner === 7 && loser >= 5) {
    return true;
  }

  return false;
}

/**
 * Tope al subir el marcador: no se puede llegar a 7 si el rival tiene menos de 5;
 * con rival 0-4 el máximo es 6 (cierre 6-0 … 6-4).
 */
export function maxGamesForReportSide(set: ReportSetGames, side: ReportSetSide): number {
  const opponent = side === 'teamA' ? set.teamB : set.teamA;
  if (opponent <= 4) {
    return 6;
  }

  return REPORT_SET_GAMES_MAX;
}

export function applyReportGameDelta(
  set: ReportSetGames,
  side: ReportSetSide,
  delta: number,
): ReportSetGames {
  const key = side;
  const next = set[key] + delta;
  const clamped = Math.min(maxGamesForReportSide(set, side), Math.max(0, next));
  return { ...set, [key]: clamped };
}

export function canIncrementReportGame(set: ReportSetGames, side: ReportSetSide): boolean {
  const key = side;
  return set[key] < maxGamesForReportSide(set, side);
}

export function setWinnerTeam(set: ReportSetGames): 'team_a' | 'team_b' | null {
  if (!isValidPadelSetScore(set.teamA, set.teamB)) {
    return null;
  }

  return set.teamA > set.teamB ? 'team_a' : 'team_b';
}

export function countSetWins(sets: ReportSetGames[]): { teamA: number; teamB: number } {
  let teamA = 0;
  let teamB = 0;

  for (const set of sets) {
    const winner = setWinnerTeam(set);
    if (winner === 'team_a') {
      teamA += 1;
    } else if (winner === 'team_b') {
      teamB += 1;
    }
  }

  return { teamA, teamB };
}

export function isReportSet3Enabled(set1: ReportSetGames, set2: ReportSetGames): boolean {
  const first = setWinnerTeam(set1);
  const second = setWinnerTeam(set2);
  if (!first || !second) {
    return false;
  }

  return first !== second;
}

export function hasMatchWinnerInFirstTwoSets(set1: ReportSetGames, set2: ReportSetGames): boolean {
  const wins = countSetWins([set1, set2]);
  return wins.teamA === 2 || wins.teamB === 2;
}

export function buildReportResultSets(
  sets: ReportSetGames[],
  set3Enabled: boolean,
): { team_a_games: number; team_b_games: number }[] {
  const played = set3Enabled ? sets : sets.slice(0, 2);
  return played.map((set) => ({
    team_a_games: set.teamA,
    team_b_games: set.teamB,
  }));
}

export function canSubmitMatchReport(sets: ReportSetGames[], set3Enabled: boolean): boolean {
  const [set1, set2, set3] = sets;
  if (!set1 || !set2 || !set3) {
    return false;
  }

  if (
    !isValidPadelSetScore(set1.teamA, set1.teamB) ||
    !isValidPadelSetScore(set2.teamA, set2.teamB)
  ) {
    return false;
  }

  if (set3Enabled) {
    if (!isValidPadelSetScore(set3.teamA, set3.teamB)) {
      return false;
    }

    const wins = countSetWins(sets);
    const maxWins = Math.max(wins.teamA, wins.teamB);
    const minWins = Math.min(wins.teamA, wins.teamB);
    return maxWins === 2 && minWins === 1;
  }

  const wins = countSetWins([set1, set2]);
  return wins.teamA === 2 || wins.teamB === 2;
}

export function createEmptyReportSets(): ReportSetGames[] {
  return Array.from({ length: REPORT_SET_COUNT }, () => ({ teamA: 0, teamB: 0 }));
}
