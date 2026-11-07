import { ClubBrowseItem } from './club-browse.models';

export const CLUB_CARD_THEMES = [0, 1, 2, 3, 4] as const;
export type ClubCardTheme = (typeof CLUB_CARD_THEMES)[number];

export function clubBadgeLabel(club: Pick<ClubBrowseItem, 'name'>): string {
  const words = club.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 'CL';
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function clubHeroThemeIndex(clubId: number): number {
  return Math.abs(clubId) % CLUB_CARD_THEMES.length;
}

export function clubHeroTheme(club: Pick<ClubBrowseItem, 'id' | 'card_theme'>): number {
  if (club.card_theme !== undefined && club.card_theme !== null) {
    return club.card_theme;
  }
  return clubHeroThemeIndex(club.id);
}
