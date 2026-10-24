import { Match, MatchPlayer, MatchResultReport, MatchSet } from '../core/api/match.models';

export type MatchPairSide = 'a' | 'b';

export const SCOREBOARD_SET_COLUMNS = 3;

const PAIR_TEAM: Record<MatchPairSide, 'team_a' | 'team_b'> = {
  a: 'team_a',
  b: 'team_b',
};

export function pairTeamKey(pair: MatchPairSide): 'team_a' | 'team_b' {
  return PAIR_TEAM[pair];
}

export function pairPlayerNames(match: Match, pair: MatchPairSide): (string | null)[] {
  const team = pairTeamKey(pair);
  const names = match.match_players
    .filter((player) => player.team === team)
    .map((player) => player.user.name);

  return [names[0] ?? null, names[1] ?? null];
}

export function pairRosterPlayers(match: Match, pair: MatchPairSide) {
  const team = pairTeamKey(pair);
  return match.match_players.filter((player) => player.team === team);
}

export function pairPlayerSlots(match: Match, pair: MatchPairSide): (MatchPlayer | null)[] {
  const players = pairRosterPlayers(match, pair);
  return [players[0] ?? null, players[1] ?? null];
}

export function scoreboardSourceSets(
  match: Match | null,
  results: MatchResultReport[],
): MatchSet[] {
  if (!match) {
    return [];
  }

  if (match.consensus?.sets?.length) {
    return match.consensus.sets;
  }

  const last = results.at(-1);
  return last?.sets ?? [];
}

export function normalizedScoreboardSets(source: MatchSet[]): MatchSet[] {
  const columns: MatchSet[] = [];
  for (let index = 0; index < SCOREBOARD_SET_COLUMNS; index += 1) {
    const set = source[index];
    columns.push(
      set ?? {
        team_a_games: 0,
        team_b_games: 0,
      },
    );
  }

  return columns;
}

export function gamesForPair(set: MatchSet, pair: MatchPairSide): number {
  return pair === 'a' ? set.team_a_games : set.team_b_games;
}

export function isSetWinnerForPair(set: MatchSet, pair: MatchPairSide): boolean {
  if (set.team_a_games === set.team_b_games) {
    return false;
  }

  return pair === 'a' ? set.team_a_games > set.team_b_games : set.team_b_games > set.team_a_games;
}

export function hasScoreboardData(match: Match | null, results: MatchResultReport[]): boolean {
  if (!match) {
    return false;
  }

  return Boolean(match.consensus?.sets?.length) || results.length > 0;
}
