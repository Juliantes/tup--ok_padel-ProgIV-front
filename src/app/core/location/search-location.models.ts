export type SearchRadiusKm = 5 | 10 | 25 | null;

export const SEARCH_RADIUS_OPTIONS: { value: SearchRadiusKm; labelKey: string }[] = [
  { value: 5, labelKey: 'SEARCH_LOCATION.RADIUS_5' },
  { value: 10, labelKey: 'SEARCH_LOCATION.RADIUS_10' },
  { value: 25, labelKey: 'SEARCH_LOCATION.RADIUS_25' },
  { value: null, labelKey: 'SEARCH_LOCATION.RADIUS_UNLIMITED' },
];

export const DEFAULT_SEARCH_RADIUS_KM: SearchRadiusKm = 10;

export type SearchOriginSource = 'autocomplete' | 'gps';

export interface SearchOrigin {
  lat: number;
  lng: number;
  label: string;
  city?: string | null;
  source: SearchOriginSource;
}

/** Query param value for `near` when origin came from GPS. */
export const GPS_QUERY_NEAR = '__gps__';

export interface SearchLocationQueryParams {
  lat?: string;
  lng?: string;
  radiusKm?: string;
  near?: string;
}
