export type PlaceMode = 'with_court' | 'without_court';

export interface MatchCreateSlotSelection {
  clubId: number;
  clubName: string;
  courtId: number;
  courtName: string;
  timeSlotId: number;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
}

export interface MatchCreateDraft {
  activeStep: string;
  completedSteps: string[];
  form: {
    matchDate: string;
    matchTime: string;
    duration: number;
    courtId: number | null;
    timeSlotId: number | null;
    placeMode: PlaceMode | null;
    autoJoin: boolean;
    levelRequired: string;
    rosterMode: string;
    joinPolicy: string;
  };
  slotLabel?: string;
}

export const MATCH_CREATE_DRAFT_KEY = 'match-create-draft';
export const MATCH_CREATE_SLOT_KEY = 'match-create-slot-selection';

export function readMatchCreateSlotSelection(): MatchCreateSlotSelection | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(MATCH_CREATE_SLOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MatchCreateSlotSelection;
  } catch {
    return null;
  }
}

export function saveMatchCreateSlotSelection(slot: MatchCreateSlotSelection): void {
  sessionStorage.setItem(MATCH_CREATE_SLOT_KEY, JSON.stringify(slot));
}

export function consumeMatchCreateSlotSelection(): MatchCreateSlotSelection | null {
  const value = readMatchCreateSlotSelection();
  if (value) {
    sessionStorage.removeItem(MATCH_CREATE_SLOT_KEY);
  }
  return value;
}

export function saveMatchCreateDraft(draft: MatchCreateDraft): void {
  sessionStorage.setItem(MATCH_CREATE_DRAFT_KEY, JSON.stringify(draft));
}

export function readMatchCreateDraft(): MatchCreateDraft | null {
  const raw = sessionStorage.getItem(MATCH_CREATE_DRAFT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as MatchCreateDraft;
  } catch {
    return null;
  }
}

export function clearMatchCreateDraft(): void {
  sessionStorage.removeItem(MATCH_CREATE_DRAFT_KEY);
  sessionStorage.removeItem(MATCH_CREATE_SLOT_KEY);
}

export function slotSelectionLabel(slot: MatchCreateSlotSelection): string {
  const club = slot.clubName;
  const court = slot.courtName;
  const when = `${slot.date} · ${slot.startTime}`;
  return `${court} — ${club} · ${when}`;
}
