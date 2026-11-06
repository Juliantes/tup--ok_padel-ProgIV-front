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
  walk_in?: boolean;
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

export interface OwnerTimeSlot {
  id: number;
  court_id: number;
  day_of_week: number;
  effective_on?: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface OwnerTimeSlotsResponse {
  time_slots: OwnerTimeSlot[];
}

export interface OwnerTimeSlotResponse {
  time_slot: OwnerTimeSlot;
}

export interface OwnerTimeSlotPayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface OwnerBulkTimeSlotsPayload {
  open_time: string;
  close_time: string;
  duration_minutes: number;
  day_of_weeks: number[];
}

export interface OwnerDayOverrideSlotPayload {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface OwnerDayOverridePayload {
  date: string;
  slots: OwnerDayOverrideSlotPayload[];
}

export interface OwnerTimeSlotsForDateResponse {
  date: string;
  day_of_week: number;
  customized: boolean;
  time_slots: OwnerTimeSlot[];
}

export interface WalkInBookingPayload {
  court_id: number;
  time_slot_id: number;
  date: string;
  walk_in_guest_name?: string | null;
  walk_in_guest_phone?: string | null;
}

export interface WalkInBookingResponse {
  match: {
    id: number;
    court_id: number;
    time_slot_id: number;
    date: string;
    status: string;
    walk_in?: boolean;
    walk_in_guest_name?: string | null;
    walk_in_guest_phone?: string | null;
  };
}

export interface PlayerAvailabilityCell {
  court_id: number;
  start_time: string;
  state: ClubScheduleCellState;
  time_slot_id: number | null;
  end_time: string | null;
}

export interface PlayerAvailabilityResponse {
  club: OwnerClub;
  date: string;
  courts: ClubScheduleCourt[];
  rows: ClubScheduleRow[];
  cells: PlayerAvailabilityCell[];
}

export interface CourtBookingPayload {
  club_id: number;
  court_id: number;
  time_slot_id: number;
  date: string;
}

export interface CourtBookingSummary {
  id: number;
  court_id?: number;
  time_slot_id?: number | null;
  date: string;
  duration: number;
  status: string;
  player_booking?: boolean;
  estimated_price: number;
  cancellable: boolean;
  court?: {
    id: number;
    name: string;
    price_per_hour: number;
  };
  club?: {
    id: number;
    name: string;
    address: string;
  };
  time_slot?: {
    id: number;
    start_time: string;
    end_time: string;
  };
}

export interface CourtBookingResponse {
  court_booking: CourtBookingSummary;
}

export interface CourtBookingsIndexResponse {
  court_bookings: CourtBookingSummary[];
}

export interface PlayerClubOption {
  id: number;
  name: string;
  address: string;
}
