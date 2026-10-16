export interface ClubSummary {
  id: number;
  name: string;
  address: string | null;
}

export interface Court {
  id: number;
  name: string;
  description: string | null;
  court_type: string;
  price_per_hour: number;
  status: string;
  club: ClubSummary;
  image_url?: string | null;
}

export interface CourtsResponse {
  courts: Court[];
}

export interface CourtResponse {
  court: Court;
}

export interface MatchCourtSummary {
  id: number;
  name: string;
  club_id: number;
}

export interface MatchUserSummary {
  id: number;
  name: string;
}

export interface MatchPlayer {
  id: number;
  user_id: number;
  team: string | null;
  status: string;
  joined_at: string | null;
  user: MatchUserSummary;
}

export interface TimeSlotSummary {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface MatchSet {
  order?: number;
  team_a_games: number;
  team_b_games: number;
}

export interface MatchResultReport {
  id: number;
  sets: MatchSet[];
  winner_team: string | null;
  reported_by: MatchUserSummary;
  created_at: string;
}

export interface MatchConsensus {
  votes: number;
  total: number;
  signature: string;
  sets: MatchSet[];
}

export interface Match {
  id: number;
  date: string;
  duration: number;
  status: string;
  roster_mode: string;
  level_required: number | null;
  join_policy: string;
  court: MatchCourtSummary;
  creator: MatchUserSummary;
  match_players: MatchPlayer[];
  players_count: number;
  max_players: number;
  time_slot?: TimeSlotSummary | null;
  match_results?: MatchResultReport[];
  consensus?: MatchConsensus | null;
}

export interface MatchesIndexResponse {
  matches: Match[];
  meta: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface MatchResponse {
  match: Match;
}

export interface MatchResultsIndexResponse {
  results: MatchResultReport[];
  consensus: MatchConsensus | null;
  total: number;
}

export interface MatchListQuery {
  page?: number;
  per_page?: number;
  status?: string;
  court_id?: number;
  date?: string;
}

export interface CreateMatchPayload {
  court_id: number;
  time_slot_id?: number | null;
  date: string;
  duration: number;
  roster_mode?: string;
  level_required?: number | null;
  auto_join?: boolean;
  join_policy?: string;
}

export interface ReportMatchResultPayload {
  sets: { team_a_games: number; team_b_games: number }[];
}
