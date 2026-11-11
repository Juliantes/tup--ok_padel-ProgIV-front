export interface PlayerSummary {
  id: number;
  name: string;
  self_level: number;
  category_label: string;
  court_side: 'derecha' | 'reves' | null;
  court_side_label: string | null;
  bio: string | null;
  wins: number;
  losses: number;
  played: number;
  win_rate: string | null;
  current_streak: number;
  best_streak: number;
  average_stars: number | null;
  reviews_count: number;
}

export interface PlayerReviewer {
  id: number;
  name: string;
}

export interface PlayerReview {
  id: number;
  stars: number;
  comment: string | null;
  level_rating: number;
  level_category_label: string;
  created_at: string;
  reviewer: PlayerReviewer;
}

export interface PlayerDetail extends PlayerSummary {
  star_counts: Record<string, number>;
  reviews: PlayerReview[];
}

export interface PlayersIndexResponse {
  players: PlayerSummary[];
  meta: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface PlayersListQuery {
  q?: string;
  page?: number;
  per_page?: number;
}
