import { Match } from '../core/api/match.models';
import {
  buildAvailableCourtCards,
  buildRecommendedMatches,
  collectCitiesFromCourts,
  collectProvincesFromCourts,
  extractCityFromAddress,
  locationMatches,
  provinceMatches,
  SELF_LEVEL_TO_CATEGORY,
} from './home-discovery.utils';

describe('home-discovery.utils', () => {
  describe('extractCityFromAddress', () => {
    it('returns last segment without postal code', () => {
      expect(extractCityFromAddress('Av. Siempre Viva 742, 1425 CABA, Buenos Aires')).toBe(
        'Buenos Aires',
      );
    });

    it('returns empty for blank address', () => {
      expect(extractCityFromAddress('')).toBe('');
    });
  });

  describe('locationMatches', () => {
    it('uses structured province and city when present', () => {
      const club = {
        address: 'Calle 1',
        province: 'Santa Fe',
        city: 'Rosario',
      };

      expect(locationMatches({ province: 'Santa Fe', city: 'Rosario' }, club)).toBe(true);
      expect(locationMatches({ province: 'Santa Fe', city: 'all' }, club)).toBe(true);
      expect(locationMatches({ province: 'Buenos Aires', city: 'all' }, club)).toBe(false);
    });

    it('excludes legacy clubs when a province is selected', () => {
      const club = { address: 'Calle 1, Rosario' };
      expect(provinceMatches('Santa Fe', club)).toBe(false);
      expect(provinceMatches('all', club)).toBe(true);
    });
  });

  describe('collectProvincesFromCourts', () => {
    it('lists distinct structured provinces', () => {
      const courts = [
        { id: 1, club: { id: 1, name: 'A', address: 'X', province: 'Santa Fe', city: 'Rosario' } },
        { id: 2, club: { id: 2, name: 'B', address: 'Y', province: 'Santa Fe', city: 'Rafaela' } },
      ] as Parameters<typeof collectProvincesFromCourts>[0];

      expect(collectProvincesFromCourts(courts)).toEqual(['Santa Fe']);
    });
  });

  describe('collectCitiesFromCourts', () => {
    it('dedupes cities from club addresses', () => {
      const courts = [
        {
          id: 1,
          club: { id: 1, name: 'A', address: 'Calle 1, Rosario' },
        },
        {
          id: 2,
          club: { id: 2, name: 'B', address: 'Calle 2, Rosario' },
        },
      ] as Parameters<typeof collectCitiesFromCourts>[0];

      expect(collectCitiesFromCourts(courts)).toEqual(['Rosario']);
    });

    it('filters cities by province', () => {
      const courts = [
        {
          id: 1,
          club: {
            id: 1,
            name: 'A',
            address: 'X',
            province: 'Santa Fe',
            city: 'Rosario',
          },
        },
        {
          id: 2,
          club: {
            id: 2,
            name: 'B',
            address: 'Y',
            province: 'Buenos Aires',
            city: 'La Plata',
          },
        },
      ] as Parameters<typeof collectCitiesFromCourts>[0];

      expect(collectCitiesFromCourts(courts, 'Santa Fe')).toEqual(['Rosario']);
    });
  });

  describe('buildAvailableCourtCards', () => {
    const now = new Date(2026, 10, 9, 14, 0, 0);
    const filters = {
      province: 'all',
      city: 'all',
      dateIso: '2026-11-09',
      timeWindow: 'now' as const,
      levelCategory: null,
      now,
    };

    it('includes available future slots sorted by time', () => {
      const availability = [
        {
          club: {
            id: 1,
            name: 'Club Norte',
            address: 'X, Rosario',
            country: null,
            province: null,
            city: null,
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
      expect(cards[0].startTime).toBe('16:00');
    });
  });

  describe('buildRecommendedMatches', () => {
    const now = new Date(2026, 10, 9, 10, 0, 0);
    const filters = {
      province: 'all',
      city: 'all',
      dateIso: '2026-11-09',
      timeWindow: 'now' as const,
      levelCategory: null,
      now,
    };

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
        club: { id: 1, name: 'Club', address: 'X, Rosario' },
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

      const result = buildRecommendedMatches([other, openMatch], filters, 50, userLevel, 'reves');
      expect(result[0].match.id).toBe(1);
      expect(result[0].tags.levelMatch).toBe(true);
    });
  });
});
