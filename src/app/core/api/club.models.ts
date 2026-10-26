import { Court } from './match.models';

export interface OwnerClub {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string | null;
}

export interface OwnerClubsResponse {
  clubs: OwnerClub[];
}

export interface OwnerClubResponse {
  club: OwnerClub;
}

export interface OwnerCourtsResponse {
  courts: Court[];
}

export interface OwnerCourtResponse {
  court: Court;
}

export interface OwnerClubPayload {
  name: string;
  address: string;
  phone: string;
  email?: string | null;
}

export interface OwnerCourtPayload {
  name: string;
  court_type: 'indoor' | 'outdoor';
  price_per_hour: number;
  description?: string | null;
  status: 'active' | 'maintenance' | 'inactive';
}
