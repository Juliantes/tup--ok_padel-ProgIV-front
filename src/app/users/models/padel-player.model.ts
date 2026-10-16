export interface PadelPlayer {
  id: string;
  fullName: string;
  image: string;
  email: string;
  age: number;
  phone: string;
  country: string;
  state: string;
  city: string;
  active?: boolean;
}

export interface CreatePadelPlayer {
  fullName: string;
  image: string;
  email: string;
  age: number;
  phone: string;
  country: string;
  state: string;
  city: string;
  active?: boolean;
}
