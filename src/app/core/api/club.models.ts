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

export type ClubScheduleCellState = 'empty' | 'blocked' | 'booked' | 'available';

export interface ClubScheduleCourt {
  id: number;
  name: string;
  price_per_hour: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface ClubScheduleRow {
  start_time: string;
  end_time: string;
}

export interface ClubScheduleCell {
  court_id: number;
  start_time: string;
  state: ClubScheduleCellState;
  time_slot_id: number | null;
  end_time: string | null;
  match_id: number | null;
}

export interface ClubScheduleResponse {
  club: OwnerClub;
  date: string;
  courts: ClubScheduleCourt[];
  rows: ClubScheduleRow[];
  cells: ClubScheduleCell[];
}

export interface ScheduleDateOption {
  isoDate: string;
  weekdayLabel: string;
  dayMonthLabel: string;
  isToday: boolean;
}
