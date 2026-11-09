import { AddressSuggestion } from '../core/api/address.models';

export interface ClubLocationDraft {
  address: string;
  country: string;
  province: string;
  city: string;
  lat: number;
  lng: number;
  place_id: string;
}

export function clubLocationFromSuggestion(
  suggestion: AddressSuggestion,
): ClubLocationDraft | null {
  const address = suggestion.address?.trim() || suggestion.formatted?.trim();
  const country = suggestion.country?.trim();
  const province = suggestion.province?.trim();
  const city = suggestion.city?.trim();
  const placeId = suggestion.place_id?.trim();

  if (!address || !country || !province || !city || !placeId) {
    return null;
  }

  if (suggestion.lat == null || suggestion.lng == null) {
    return null;
  }

  return {
    address,
    country,
    province,
    city,
    lat: suggestion.lat,
    lng: suggestion.lng,
    place_id: placeId,
  };
}
