import { ApiCourtSide } from '../core/api/api-user.model';
import { PlayerAvailabilityResponse } from '../core/api/club.models';
import { Court, Match } from '../core/api/match.models';
import { canJoinMatch, TimeOfDayFilter } from '../matches/matches-search.utils';

export type HomeTimeWindow = 'now' | TimeOfDayFilter;

export interface ClubLocationFields {
  address?: string | null;
  city?: string | null;
  province?: string | null;
}

export interface HomeDiscoveryFilters {
  province: string;
  city: string;
  dateIso: string;
  timeWindow: HomeTimeWindow;
  levelCategory: string | null;
  now?: Date;
}

export interface AvailableCourtSlotCard {
  clubId: number;
  clubName: string;
  clubAddress: string;
  city: string;
  courtId: number;
  courtName: string;
  courtType: string;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  timeSlotId: number;
  pricePerHour: number;
  minutesFromNow: number;
}

export interface RecommendedMatchCard {
  match: Match;
  affinityScore: number;
  spotsLeft: number;
  matchCity: string | null;
  tags: { levelMatch: boolean; sideMatch: boolean; cityMatch: boolean };
}

export const SELF_LEVEL_TO_CATEGORY: Record<number, string> = {
  1: 'first',
  2: 'second',
  3: 'third',
  4: 'fourth',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
};

const CATEGORY_ORDER = [
  'open',
  'eighth',
  'seventh',
  'sixth',
  'fifth',
  'fourth',
  'third',
  'second',
  'first',
] as const;

function normalizeCityToken(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export function extractCityFromAddress(address: string | null | undefined): string {
  if (!address?.trim()) {
    return '';
  }

  const segments = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return '';
  }

  const last = segments[segments.length - 1];
  const withoutPostal = last.replace(/^\d{4,8}\s*/, '').trim();
  return withoutPostal || last;
}

export function resolveClubCity(club: ClubLocationFields): string {
  const structured = club.city?.trim();
  if (structured) {
    return structured;
  }
  return extractCityFromAddress(club.address);
}

export function resolveClubProvince(club: ClubLocationFields): string {
  return club.province?.trim() ?? '';
}

export function collectProvincesFromCourts(courts: Court[]): string[] {
  const seen = new Set<string>();
  const provinces: string[] = [];

  for (const court of courts) {
    const province = court.club.province?.trim();
    if (!province) {
      continue;
    }
    const key = normalizeCityToken(province);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    provinces.push(province);
  }

  return provinces.sort((a, b) => a.localeCompare(b, 'es'));
}

export function collectCitiesFromCourts(courts: Court[], selectedProvince = 'all'): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];

  for (const court of courts) {
    if (selectedProvince !== 'all') {
      const province = court.club.province?.trim();
      if (!province || normalizeCityToken(province) !== normalizeCityToken(selectedProvince)) {
        continue;
      }
    }

    const city = resolveClubCity(court.club);
    if (!city) {
      continue;
    }
    const key = normalizeCityToken(city);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    cities.push(city);
  }

  return cities.sort((a, b) => a.localeCompare(b, 'es'));
}

export function provinceMatches(selectedProvince: string, club: ClubLocationFields): boolean {
  if (selectedProvince === 'all' || !selectedProvince.trim()) {
    return true;
  }

  const province = resolveClubProvince(club);
  if (!province) {
    return false;
  }

  return normalizeCityToken(province) === normalizeCityToken(selectedProvince);
}

export function cityMatches(selectedCity: string, club: ClubLocationFields): boolean {
  if (selectedCity === 'all' || !selectedCity.trim()) {
    return true;
  }

  const city = resolveClubCity(club);
  return normalizeCityToken(city) === normalizeCityToken(selectedCity);
}

export function locationMatches(
  filters: Pick<HomeDiscoveryFilters, 'province' | 'city'>,
  club: ClubLocationFields,
): boolean {
  if (!provinceMatches(filters.province, club)) {
    return false;
  }

  return cityMatches(filters.city, club);
}

function parseSlotStart(isoDate: string, startTime: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = startTime.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function slotDurationMinutes(startTime: string, endTime: string | null): number {
  if (!endTime) {
    return 90;
  }
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return endH * 60 + endM - (startH * 60 + startM);
}

function matchesTimeWindow(slotStart: Date, window: HomeTimeWindow, now: Date): boolean {
  if (window === 'now') {
    return slotStart.getTime() >= now.getTime();
  }

  const hour = slotStart.getHours();
  if (window === 'morning') {
    return hour < 12;
  }
  if (window === 'afternoon') {
    return hour >= 12 && hour < 18;
  }
  return hour >= 18;
}

export function buildAvailableCourtCards(
  availabilityByClub: PlayerAvailabilityResponse[],
  filters: HomeDiscoveryFilters,
  courtsById = new Map<number, Court>(),
  limit = 24,
): AvailableCourtSlotCard[] {
  const now = filters.now ?? new Date();
  const cards: AvailableCourtSlotCard[] = [];

  for (const response of availabilityByClub) {
    if (response.date !== filters.dateIso) {
      continue;
    }

    if (!locationMatches(filters, response.club)) {
      continue;
    }

    const city = resolveClubCity(response.club);
    const courtById = new Map(response.courts.map((court) => [court.id, court]));

    for (const cell of response.cells) {
      if (cell.state !== 'available' || !cell.time_slot_id) {
        continue;
      }

      const court = courtById.get(cell.court_id);
      if (!court || court.status !== 'active') {
        continue;
      }

      const slotStart = parseSlotStart(filters.dateIso, cell.start_time);
      if (slotStart.getTime() <= now.getTime() - 60_000) {
        continue;
      }

      if (!matchesTimeWindow(slotStart, filters.timeWindow, now)) {
        continue;
      }

      const minutesFromNow = Math.max(
        0,
        Math.round((slotStart.getTime() - now.getTime()) / 60_000),
      );

      const courtMeta = courtsById.get(court.id);

      cards.push({
        clubId: response.club.id,
        clubName: response.club.name,
        clubAddress: response.club.address,
        city,
        courtId: court.id,
        courtName: court.name,
        courtType: courtMeta?.court_type ?? 'indoor',
        dateIso: filters.dateIso,
        startTime: cell.start_time,
        endTime: cell.end_time,
        timeSlotId: cell.time_slot_id,
        pricePerHour: court.price_per_hour,
        minutesFromNow,
      });
    }
  }

  cards.sort((a, b) => {
    if (a.minutesFromNow !== b.minutesFromNow) {
      return a.minutesFromNow - b.minutesFromNow;
    }
    return a.clubName.localeCompare(b.clubName, 'es');
  });

  return cards.slice(0, limit);
}

function complementarySide(side: ApiCourtSide | null): ApiCourtSide | null {
  if (side === 'derecha') {
    return 'reves';
  }
  if (side === 'reves') {
    return 'derecha';
  }
  return null;
}

function levelMatchesProfile(matchLevel: string, userCategory: string | null): boolean {
  if (matchLevel === 'open') {
    return true;
  }
  if (!userCategory) {
    return true;
  }
  return matchLevel === userCategory;
}

function sideAffinity(match: Match, userSide: ApiCourtSide | null): boolean {
  const needed = complementarySide(userSide);
  if (!needed) {
    return false;
  }

  const activeSides = match.match_players
    .filter((p) => p.status !== 'cancelled')
    .map((p) => p.user.court_side)
    .filter(Boolean);

  if (activeSides.length === 0) {
    return true;
  }

  return !activeSides.includes(needed);
}

function affinityScore(
  match: Match,
  filters: HomeDiscoveryFilters,
  userId: number | undefined,
  userCategory: string | null,
  userSide: ApiCourtSide | null,
): { score: number; tags: RecommendedMatchCard['tags'] } {
  let score = 0;

  const levelMatch = levelMatchesProfile(match.level_required, userCategory);
  if (levelMatch && match.level_required !== 'open' && userCategory === match.level_required) {
    score += 40;
  } else if (match.level_required === 'open') {
    score += 10;
  }

  const sideMatch = sideAffinity(match, userSide);
  if (sideMatch && userSide) {
    score += 25;
  }

  const cityMatch = match.court?.club
    ? cityMatches(filters.city, match.court.club)
    : filters.city === 'all';
  if (cityMatch && filters.city !== 'all') {
    score += 20;
  }

  if (filters.levelCategory && match.level_required === filters.levelCategory) {
    score += 15;
  }

  const when = new Date(match.date);
  if (filters.timeWindow === 'now') {
    const now = filters.now ?? new Date();
    if (when.getTime() >= now.getTime()) {
      const hours = (when.getTime() - now.getTime()) / 3_600_000;
      score += Math.max(0, 30 - hours);
    }
  } else if (matchesTimeWindow(when, filters.timeWindow, filters.now ?? new Date())) {
    score += 12;
  }

  if (canJoinMatch(match, userId)) {
    score += 5;
  }

  return {
    score,
    tags: {
      levelMatch: levelMatch && match.level_required !== 'open',
      sideMatch,
      cityMatch: cityMatch && filters.city !== 'all',
    },
  };
}

export function buildRecommendedMatches(
  matches: Match[],
  filters: HomeDiscoveryFilters,
  userId: number | undefined,
  selfLevel: number | null,
  userSide: ApiCourtSide | null,
  limit = 24,
): RecommendedMatchCard[] {
  const now = filters.now ?? new Date();
  const userCategory =
    selfLevel !== null && selfLevel in SELF_LEVEL_TO_CATEGORY
      ? SELF_LEVEL_TO_CATEGORY[selfLevel]
      : null;

  const candidates: RecommendedMatchCard[] = [];

  for (const match of matches) {
    if (match.status !== 'open') {
      continue;
    }

    if (match.players_count >= match.max_players) {
      continue;
    }

    const when = new Date(match.date);
    if (when.getTime() < now.getTime()) {
      continue;
    }

    if (!canJoinMatch(match, userId)) {
      continue;
    }

    if (match.court?.club && !locationMatches(filters, match.court.club)) {
      continue;
    }

    if (filters.levelCategory && match.level_required !== filters.levelCategory) {
      if (match.level_required !== 'open') {
        continue;
      }
    }

    const sameDay =
      when.getFullYear() === parseInt(filters.dateIso.slice(0, 4), 10) &&
      when.getMonth() + 1 === parseInt(filters.dateIso.slice(5, 7), 10) &&
      when.getDate() === parseInt(filters.dateIso.slice(8, 10), 10);

    if (!sameDay) {
      continue;
    }

    if (!matchesTimeWindow(when, filters.timeWindow, now)) {
      continue;
    }

    const { score, tags } = affinityScore(match, filters, userId, userCategory, userSide);

    candidates.push({
      match,
      affinityScore: score,
      spotsLeft: match.max_players - match.players_count,
      matchCity: match.court?.club ? resolveClubCity(match.court.club) : null,
      tags,
    });
  }

  candidates.sort((a, b) => {
    if (b.affinityScore !== a.affinityScore) {
      return b.affinityScore - a.affinityScore;
    }
    return new Date(a.match.date).getTime() - new Date(b.match.date).getTime();
  });

  return candidates.slice(0, limit);
}

export function categoryForSelfLevel(selfLevel: number | null | undefined): string | null {
  if (selfLevel === null || selfLevel === undefined) {
    return null;
  }
  return SELF_LEVEL_TO_CATEGORY[selfLevel] ?? null;
}

export function levelOptionsForSelect(): string[] {
  return [...CATEGORY_ORDER];
}

export function estimatedSlotPrice(
  pricePerHour: number,
  startTime: string,
  endTime: string | null,
): number {
  const minutes = slotDurationMinutes(startTime, endTime);
  return Math.round((pricePerHour * minutes) / 60);
}
