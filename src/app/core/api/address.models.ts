export interface AddressSuggestion {
  street: string | null;
  housenumber: string | null;
  city: string | null;
  province: string | null;
  postcode: string | null;
  country: string | null;
  formatted: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string;
}

export interface AddressAutocompleteResponse {
  addresses: AddressSuggestion[];
}
