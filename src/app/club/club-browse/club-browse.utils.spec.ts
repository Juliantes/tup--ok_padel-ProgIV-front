import { describe, expect, it } from 'vitest';

import { clubBadgeLabel, clubHeroTheme, clubHeroThemeIndex } from './club-browse.utils';

describe('club-browse.utils', () => {
  it('builds badge initials from club name', () => {
    expect(clubBadgeLabel({ name: '3GEN PADEL ACADEMY' })).toBe('3P');
    expect(clubBadgeLabel({ name: 'Solo' })).toBe('SOL');
    expect(clubBadgeLabel({ name: '   ' })).toBe('CL');
  });

  it('cycles hero themes by club id when card_theme is missing', () => {
    expect(clubHeroThemeIndex(1)).toBe(1);
    expect(clubHeroThemeIndex(3)).toBe(3);
    expect(clubHeroTheme({ id: 3 })).toBe(3);
  });

  it('uses card_theme when provided', () => {
    expect(clubHeroTheme({ id: 3, card_theme: 2 })).toBe(2);
  });
});
