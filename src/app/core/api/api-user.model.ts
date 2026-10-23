export type ApiUserRole = 'admin' | 'player' | 'club_owner';
export type ApiCourtSide = 'derecha' | 'reves';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  self_level: number;
  category_label: string;
  court_side: ApiCourtSide | null;
  court_side_label: string | null;
  bio: string | null;
  average_level: string | null;
  average_stars: string | null;
  matches_played: number;
  roles: ApiUserRole[];
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface UserResponse {
  user: ApiUser;
}
