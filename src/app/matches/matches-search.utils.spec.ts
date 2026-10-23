import { Match } from '../core/api/match.models';
import { filterMatches } from './matches-search.utils';

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 1,
    date: '2026-10-23T09:00:00.000Z',
    duration: 90,
    status: 'open',
    roster_mode: 'individual',
    level_required: 'fifth',
    join_policy: 'auto',
    court: {
      id: 1,
      name: 'Cancha 1',
      club_id: 1,
      price_per_hour: 5000,
      club: { id: 1, name: 'Club Test', address: 'Calle 1' },
    },
    creator: { id: 1, name: 'Ana Test' },
    match_players: [],
    players_count: 2,
    max_players: 4,
    ...overrides,
  };
}

describe('filterMatches', () => {
  it('filters matches with open spots when onlyOpenSpots is enabled', () => {
    const matches = [
      buildMatch({ id: 1, status: 'open', players_count: 2 }),
      buildMatch({ id: 2, status: 'full', players_count: 4 }),
    ];

    const result = filterMatches(matches, {
      onlyOpenSpots: true,
      datePreset: 'any',
      pickedDate: null,
      timeOfDay: null,
      category: null,
    });

    expect(result.map((m) => m.id)).toEqual([1]);
  });
});
