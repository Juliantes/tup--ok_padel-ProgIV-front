import { AddressSuggestion } from '../core/api/address.models';
import { clubLocationFromSuggestion } from './club-location.utils';

describe('clubLocationFromSuggestion', () => {
  const baseSuggestion = (overrides: Partial<AddressSuggestion> = {}): AddressSuggestion => ({
    street: 'Calle 1',
    housenumber: '100',
    city: 'Rosario',
    province: 'Santa Fe',
    postcode: '2000',
    country: 'Argentina',
    formatted: 'Calle 1 100, Rosario, Argentina',
    address: 'Calle 1 100, Rosario, Argentina',
    lat: -32.95,
    lng: -60.67,
    place_id: 'place-1',
    ...overrides,
  });

  it('maps a complete suggestion', () => {
    expect(clubLocationFromSuggestion(baseSuggestion())).toEqual({
      address: 'Calle 1 100, Rosario, Argentina',
      country: 'Argentina',
      province: 'Santa Fe',
      city: 'Rosario',
      lat: -32.95,
      lng: -60.67,
      place_id: 'place-1',
    });
  });

  it('returns null when required fields are missing', () => {
    expect(clubLocationFromSuggestion(baseSuggestion({ city: null }))).toBeNull();
  });
});
