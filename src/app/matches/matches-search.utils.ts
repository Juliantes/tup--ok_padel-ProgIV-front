import { Match, MatchPlayer } from '../core/api/match.models';

export type DateFilterPreset = 'any' | 'today' | 'tomorrow' | 'week' | 'pick';
export type TimeOfDayFilter = 'morning' | 'afternoon' | 'night';

export interface MatchSearchFilters {
  onlyOpenSpots: boolean;
  datePreset: DateFilterPreset;
  pickedDate: string | null;
  timeOfDay: TimeOfDayFilter | null;
  category: string | null;
}

export const LEVEL_REQUIRED_OPTIONS = [
  'open',
  'eighth',
  'seventh',
  'sixth',
  'fifth',
  'fourth',
  'third',
  'second',
  'first',
] as const;

export const LEVEL_I18N_KEYS: Record<string, string> = {
  open: 'MATCHES.LEVEL_OPEN',
  eighth: 'MATCHES.LEVEL_EIGHTH',
  seventh: 'MATCHES.LEVEL_SEVENTH',
  sixth: 'MATCHES.LEVEL_SIXTH',
  fifth: 'MATCHES.LEVEL_FIFTH',
  fourth: 'MATCHES.LEVEL_FOURTH',
  third: 'MATCHES.LEVEL_THIRD',
  second: 'MATCHES.LEVEL_SECOND',
  first: 'MATCHES.LEVEL_FIRST',
};

export function levelRequiredI18nKey(level: string): string {
  return LEVEL_I18N_KEYS[level] ?? 'MATCHES.LEVEL_OPEN';
}

export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function rosterSlots(match: Match): { filled: MatchPlayer | null }[] {
  const slots: { filled: MatchPlayer | null }[] = [];
  const players = [...match.match_players];

  if (match.roster_mode === 'pairs') {
    const teamA = players.filter((p) => p.team === 'team_a');
    const teamB = players.filter((p) => p.team === 'team_b');
    const ordered = [
      ...teamA,
      ...teamB,
      ...players.filter((p) => p.team !== 'team_a' && p.team !== 'team_b'),
    ];

    for (let i = 0; i < match.max_players; i += 1) {
      slots.push({ filled: ordered[i] ?? null });
    }

    return slots;
  }

  for (let i = 0; i < match.max_players; i += 1) {
    slots.push({ filled: players[i] ?? null });
  }

  return slots;
}

export function isUserEnrolled(match: Match, userId: number | undefined): boolean {
  if (userId === undefined) {
    return false;
  }

  return match.match_players.some(
    (player) => player.user_id === userId && player.status !== 'cancelled',
  );
}

export function pickJoinTeam(match: Match): string | undefined {
  if (match.roster_mode !== 'pairs') {
    return undefined;
  }

  const teamACount = match.match_players.filter((p) => p.team === 'team_a').length;
  const teamBCount = match.match_players.filter((p) => p.team === 'team_b').length;

  if (teamACount < 2) {
    return 'team_a';
  }

  if (teamBCount < 2) {
    return 'team_b';
  }

  return undefined;
}

export function canJoinMatch(match: Match, userId: number | undefined): boolean {
  if (match.status !== 'open') {
    return false;
  }

  if (isUserEnrolled(match, userId)) {
    return false;
  }

  if (match.players_count >= match.max_players) {
    return false;
  }

  if (match.roster_mode === 'pairs' && pickJoinTeam(match) === undefined) {
    return false;
  }

  return true;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function matchDate(match: Match): Date {
  return new Date(match.date);
}

function matchesDatePreset(
  match: Match,
  preset: DateFilterPreset,
  pickedDate: string | null,
): boolean {
  if (preset === 'any') {
    return true;
  }

  const when = matchDate(match);
  const now = new Date();
  const today = startOfDay(now);

  if (preset === 'today') {
    return isSameCalendarDay(when, today);
  }

  if (preset === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameCalendarDay(when, tomorrow);
  }

  if (preset === 'week') {
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return when >= weekStart && when <= weekEnd;
  }

  if (preset === 'pick' && pickedDate) {
    const picked = new Date(`${pickedDate}T12:00:00`);
    return isSameCalendarDay(when, picked);
  }

  return true;
}

function matchesTimeOfDay(match: Match, timeOfDay: TimeOfDayFilter | null): boolean {
  if (!timeOfDay) {
    return true;
  }

  const hour = matchDate(match).getHours();

  if (timeOfDay === 'morning') {
    return hour < 12;
  }

  if (timeOfDay === 'afternoon') {
    return hour >= 12 && hour < 18;
  }

  return hour >= 18;
}

export function filterMatches(matches: Match[], filters: MatchSearchFilters): Match[] {
  return matches.filter((match) => {
    if (
      filters.onlyOpenSpots &&
      match.status !== 'open' &&
      match.players_count >= match.max_players
    ) {
      return false;
    }

    if (!matchesDatePreset(match, filters.datePreset, filters.pickedDate)) {
      return false;
    }

    if (!matchesTimeOfDay(match, filters.timeOfDay)) {
      return false;
    }

    if (filters.category && match.level_required !== filters.category) {
      return false;
    }

    return true;
  });
}
