import { Match } from '../core/api/match.models';
import {
  buildAvailableCourtCards,
  buildRecommendedMatches,
  extractCityFromAddress,
  locationMatches,
  provinceMatches,
  proximityMatchesClub,
  SELF_LEVEL_TO_CATEGORY,
} from './home-discovery.utils';

describe('home-discovery.utils', () => {
  const baseFilters = {
    origin: null,
    radiusKm: 10 as const,
    originIsGps: false,
    dateIso: '2026-11-09',
    timeWindow: 'now' as const,
    levelCategory: null,
    now: new Date(2026, 10, 9, 14, 0, 0),
  };

  describe('extractCityFromAddress', () => {
    it('returns last segment without postal code', () => {
      expect(extractCityFromAddress('Av. Siempre Viva 742, 1425 CABA, Buenos Aires')).toBe(
        'Buenos Aires',
      );
    });
  });

  describe('locationMatches (legacy)', () => {
    it('uses structured province and city when present', () => {
      const club = {
        address: 'Calle 1',
        province: 'Santa Fe',
        city: 'Rosario',
      };

      expect(locationMatches({ province: 'Santa Fe', city: 'Rosario' }, club)).toBe(true);
      expect(provinceMatches('Santa Fe', { address: 'Calle 1, Rosario' })).toBe(false);
    });
  });

  describe('proximityMatchesClub', () => {
    it('allows all clubs when origin is unset', () => {
      expect(proximityMatchesClub(baseFilters, { lat: -32.95, lng: -60.67, city: 'Rosario' })).toBe(
        true,
      );
    });

    it('filters by radius when origin is set', () => {
      const filters = {
        ...baseFilters,
        origin: {
          lat: -32.95,
          lng: -60.67,
          label: 'Centro',
          city: 'Rosario',
          source: 'autocomplete' as const,
        },
        radiusKm: 5 as const,
      };
      expect(proximityMatchesClub(filters, { lat: -32.946, lng: -60.639 })).toBe(true);
      expect(proximityMatchesClub(filters, { lat: -34.6, lng: -58.38 })).toBe(false);
    });
  });

  describe('buildAvailableCourtCards', () => {
    it('includes available future slots sorted by distance when origin set', () => {
      const filters = {
        ...baseFilters,
        origin: {
          lat: -32.95,
          lng: -60.67,
          label: 'Centro',
          city: 'Rosario',
          source: 'autocomplete' as const,
        },
      };

      const availability = [
        {
          club: {
            id: 1,
            name: 'Club Norte',
            address: 'X',
            country: null,
            province: null,
            city: 'Rosario',
            lat: -32.946,
            lng: -60.639,
            phone: '1',
            email: null,
            card_theme: 0,
          },
          date: '2026-11-09',
          courts: [
            {
              id: 10,
              name: 'C1',
              price_per_hour: 100,
              status: 'active' as const,
              color: 0 as const,
            },
          ],
          rows: [{ start_time: '16:00', end_time: '17:30' }],
          cells: [
            {
              court_id: 10,
              start_time: '16:00',
              state: 'available' as const,
              time_slot_id: 5,
              end_time: '17:30',
            },
          ],
        },
      ];

      const cards = buildAvailableCourtCards(availability, filters);
      expect(cards.length).toBe(1);
      expect(cards[0].distanceKm).not.toBeNull();
    });
  });

  describe('buildRecommendedMatches', () => {
    const baseMatch = {
      id: 1,
      date: '2026-11-09T18:00:00',
      duration: 90,
      status: 'open',
      roster_mode: 'pairs',
      level_required: 'sixth',
      join_policy: 'auto',
      court: {
        id: 1,
        name: 'C1',
        club_id: 1,
        price_per_hour: 100,
        club: {
          id: 1,
          name: 'Club',
          address: 'X, Rosario',
          lat: -32.946,
          lng: -60.639,
        },
      },
      creator: { id: 99, name: 'Ana' },
      match_players: [],
      players_count: 2,
      max_players: 4,
    } as Match;

    it('ranks level-matching open matches for user category', () => {
      const userLevel = 6;
      const category = SELF_LEVEL_TO_CATEGORY[userLevel];
      const openMatch = { ...baseMatch, level_required: category };
      const other = { ...baseMatch, id: 2, level_required: 'first' };

      const result = buildRecommendedMatches(
        [other, openMatch],
        baseFilters,
        50,
        userLevel,
        'reves',
      );
      expect(result[0].match.id).toBe(1);
      expect(result[0].tags.levelMatch).toBe(true);
    });

    it('excludes walk-in matches when origin is set', () => {
      const filters = {
        ...baseFilters,
        origin: {
          lat: -32.95,
          lng: -60.67,
          label: 'Centro',
          source: 'gps' as const,
        },
      };
      const walkIn = { ...baseMatch, id: 2, court: null };
      const result = buildRecommendedMatches([walkIn], filters, 50, 6, 'reves');
      expect(result).toHaveLength(0);
    });
  });
});
