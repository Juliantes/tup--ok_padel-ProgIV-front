import { describe, expect, it } from 'vitest';

import { Match } from '../core/api/match.models';
import {
  gamesForPair,
  hasScoreboardData,
  isSetWinnerForPair,
  normalizedScoreboardSets,
  pairPlayerNames,
  scoreboardSourceSets,
} from './match-scoreboard.utils';

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    date: '2026-10-24T20:30:00.000-03:00',
    duration: 90,
    status: 'completed',
    roster_mode: 'pairs',
    level_required: 'fifth',
    join_policy: 'auto',
    court: {
      id: 1,
      name: 'Cancha 1',
      club_id: 1,
      price_per_hour: 10000,
      club: { id: 1, name: 'Club', address: 'Calle 1' },
    },
    creator: { id: 1, name: 'Creador' },
    match_players: [],
    players_count: 4,
    max_players: 4,
    match_results: [],
    consensus: null,
    ...overrides,
  };
}

describe('match-scoreboard.utils', () => {
  it('groups player names into two slots per pair', () => {
    const match = buildMatch({
      match_players: [
        {
          id: 1,
          user_id: 1,
          team: 'team_a',
          status: 'confirmed',
          joined_at: null,
          user: { id: 1, name: 'Ana' },
        },
        {
          id: 2,
          user_id: 2,
          team: 'team_a',
          status: 'confirmed',
          joined_at: null,
          user: { id: 2, name: 'Bruno' },
        },
        {
          id: 3,
          user_id: 3,
          team: 'team_b',
          status: 'confirmed',
          joined_at: null,
          user: { id: 3, name: 'Carla' },
        },
      ],
    });

    expect(pairPlayerNames(match, 'a')).toEqual(['Ana', 'Bruno']);
    expect(pairPlayerNames(match, 'b')).toEqual(['Carla', null]);
  });

  it('prefers consensus sets over last report', () => {
    const match = buildMatch({
      consensus: {
        votes: 2,
        total: 4,
        signature: 'x',
        sets: [{ team_a_games: 6, team_b_games: 4 }],
      },
    });
    const results = [
      {
        id: 1,
        sets: [{ team_a_games: 4, team_b_games: 6 }],
        winner_team: 'team_b',
        reported_by: { id: 1, name: 'Reporter' },
        created_at: '2026-10-25T00:00:00.000Z',
      },
    ];

    expect(scoreboardSourceSets(match, results)).toEqual([{ team_a_games: 6, team_b_games: 4 }]);
  });

  it('pads scoreboard to three set columns', () => {
    expect(normalizedScoreboardSets([{ team_a_games: 6, team_b_games: 3 }])).toHaveLength(3);
  });

  it('detects set winner per pair', () => {
    const set = { team_a_games: 6, team_b_games: 4 };
    expect(isSetWinnerForPair(set, 'a')).toBe(true);
    expect(isSetWinnerForPair(set, 'b')).toBe(false);
    expect(gamesForPair(set, 'b')).toBe(4);
  });

  it('knows when score data exists', () => {
    expect(hasScoreboardData(buildMatch(), [])).toBe(false);
    expect(
      hasScoreboardData(
        buildMatch({
          consensus: {
            votes: 1,
            total: 4,
            signature: 'y',
            sets: [{ team_a_games: 6, team_b_games: 0 }],
          },
        }),
        [],
      ),
    ).toBe(true);
  });
});
