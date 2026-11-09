import { haversineKm, clubHasCoords } from './geo.utils';
import { SearchOrigin } from './search-location.models';

export interface ClubProximityFields {
  address?: string | null;
  province?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function normalizeLocationToken(value: string): string {
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

export function resolveClubCity(club: ClubProximityFields): string {
  const structured = club.city?.trim();
  if (structured) {
    return structured;
  }
  return extractCityFromAddress(club.address);
}

export function distanceKmToClub(
  origin: Pick<SearchOrigin, 'lat' | 'lng'>,
  club: ClubProximityFields,
): number | null {
  if (!clubHasCoords(club)) {
    return null;
  }
  return haversineKm(origin.lat, origin.lng, club.lat!, club.lng!);
}

export function citiesMatch(
  originCity: string | null | undefined,
  clubCity: string | null | undefined,
): boolean {
  if (!originCity?.trim() || !clubCity?.trim()) {
    return false;
  }
  return normalizeLocationToken(originCity) === normalizeLocationToken(clubCity);
}

/** Loose match when clubs are not geocoded: city token appears in address or structured fields. */
export function clubMentionsOriginPlace(origin: SearchOrigin, club: ClubProximityFields): boolean {
  const tokens = [origin.city, origin.label]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (tokens.length === 0) {
    return false;
  }

  const fields = [club.city, club.province, club.address, resolveClubCity(club)]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeLocationToken(value));

  return tokens.some((token) => {
    const normalized = normalizeLocationToken(token);
    if (normalized.length < 3) {
      return false;
    }
    return fields.some((field) => field.includes(normalized) || normalized.includes(field));
  });
}

/** Whether a club should appear given search origin, radius, and GPS vs address origin. */
export function clubMatchesProximity(
  origin: SearchOrigin | null,
  radiusKm: number | null,
  club: ClubProximityFields,
  originIsGps: boolean,
): boolean {
  if (!origin) {
    return true;
  }

  const distance = distanceKmToClub(origin, club);
  if (distance !== null) {
    if (radiusKm === null) {
      return true;
    }
    return distance <= radiusKm;
  }

  if (originIsGps) {
    return true;
  }

  const clubCity = resolveClubCity(club);
  if (citiesMatch(origin.city, clubCity)) {
    return true;
  }

  return clubMentionsOriginPlace(origin, club);
}

export function compareByDistanceThenName(
  a: { distanceKm: number | null; name: string },
  b: { distanceKm: number | null; name: string },
): number {
  const aDist = a.distanceKm;
  const bDist = b.distanceKm;
  if (aDist !== null && bDist !== null && aDist !== bDist) {
    return aDist - bDist;
  }
  if (aDist !== null && bDist === null) {
    return -1;
  }
  if (aDist === null && bDist !== null) {
    return 1;
  }
  return a.name.localeCompare(b.name, 'es');
}
