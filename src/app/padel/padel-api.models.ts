export const PADEL_API_BASE_URL = 'https://padelapi.org/api';

export type PadelHiddenValue = 'hidden_free_plan';

export interface PadelPaginated<T> {
  data: T[];
}

export interface PadelTournament {
  id: number;
  name: string;
  photo_url: string | null;
  location: string;
  country: string;
  level: string;
  status: string;
  start_date: string;
  end_date: string;
  url: string | null;
}

export interface PadelPlayerRanking {
  id: number;
  name: string;
  nationality: string;
  ranking: number | PadelHiddenValue;
  points: number | PadelHiddenValue;
  ranking_diff?: number | PadelHiddenValue;
}

export interface PadelMatchSetScore {
  team_1: string;
  team_2: string;
}

export interface PadelMatch {
  id: number;
  name: string;
  round_name: string | null;
  status: string;
  played_at: string | null;
  score: PadelMatchSetScore[] | PadelHiddenValue | null;
  url: string | null;
}

export interface PadelHomeNewsItem {
  title: string;
  url: string | null;
}

export interface PadelHomeSlide {
  tournament: PadelTournament;
  news: PadelHomeNewsItem[];
}

export interface PadelHomeDashboard {
  slides: PadelHomeSlide[];
  menRankings: PadelPlayerRanking[];
  womenRankings: PadelPlayerRanking[];
  recentMatches: PadelMatch[];
}
