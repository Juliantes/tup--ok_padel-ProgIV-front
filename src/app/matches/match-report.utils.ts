export interface ReportSetGames {
  teamA: number;
  teamB: number;
}

export const REPORT_SET_COUNT = 3;
export const REPORT_GAMES_MAX = 99;

export function isValidPadelSetScore(teamA: number, teamB: number): boolean {
  if (teamA === teamB) {
    return false;
  }

  const winner = Math.max(teamA, teamB);
  const loser = Math.min(teamA, teamB);

  if (winner === 6 && loser <= 4) {
    return true;
  }
  if (winner === 7 && loser === 5) {
    return true;
  }
  if (winner === 7 && loser === 6) {
    return true;
  }
  if (winner >= 8 && winner - loser === 2 && loser >= 6) {
    return true;
  }

  return false;
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

export function clampReportGames(value: number): number {
  return Math.min(REPORT_GAMES_MAX, Math.max(0, value));
}

export function createEmptyReportSets(): ReportSetGames[] {
  return Array.from({ length: REPORT_SET_COUNT }, () => ({ teamA: 0, teamB: 0 }));
}
