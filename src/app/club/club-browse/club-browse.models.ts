export interface ClubBrowseItem {
  id: number;
  name: string;
  address: string;
  phone?: string;
  card_theme?: number;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceKm?: number | null;
}
