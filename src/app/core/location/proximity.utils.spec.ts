import { clubMatchesProximity, clubMentionsOriginPlace, distanceKmToClub } from './proximity.utils';
import { SearchOrigin } from './search-location.models';

describe('proximity.utils', () => {
  const origin: SearchOrigin = {
    lat: -32.95,
    lng: -60.67,
    label: 'Rosario, Santa Fe',
    city: 'Rosario',
    source: 'autocomplete',
  };

  it('includes geocoded clubs within radius', () => {
    const club = { lat: -32.946, lng: -60.639 };
    const distance = distanceKmToClub(origin, club);
    expect(distance).not.toBeNull();
    expect(clubMatchesProximity(origin, 25, club, false)).toBe(true);
    expect(clubMatchesProximity(origin, 1, club, false)).toBe(false);
  });

  it('allows unlimited radius for distant geocoded clubs', () => {
    const club = { lat: -34.6, lng: -58.38 };
    expect(clubMatchesProximity(origin, null, club, false)).toBe(true);
  });

  it('falls back to city match for clubs without coords when origin is address', () => {
    const club = { city: 'Rosario' };
    expect(clubMatchesProximity(origin, 10, club, false)).toBe(true);
  });

  it('matches address text when structured city is missing', () => {
    const club = { address: 'Calle 24, Villa San Carlos, 1923 Berisso, Argentina' };
    const berissoOrigin: SearchOrigin = {
      ...origin,
      city: 'Berisso',
      label: 'Berisso, Buenos Aires',
    };
    expect(clubMentionsOriginPlace(berissoOrigin, club)).toBe(true);
    expect(clubMatchesProximity(berissoOrigin, 10, club, false)).toBe(true);
  });

  it('keeps ungeocoded clubs visible when origin is GPS', () => {
    const club = { address: 'Av. Siempre Viva 742, Buenos Aires' };
    expect(clubMatchesProximity(origin, 10, club, true)).toBe(true);
  });
});
