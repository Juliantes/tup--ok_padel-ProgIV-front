import { CreateMatchPayload } from '../core/api/match.models';

export type CreateWizardStep = 'date' | 'place' | 'play' | 'category' | 'who' | 'visibility';

export const CREATE_WIZARD_STEPS: CreateWizardStep[] = [
  'date',
  'place',
  'play',
  'category',
  'who',
  'visibility',
];

export const MATCH_MAX_PLAYERS = 4;

export const DURATION_OPTIONS = [60, 90, 120] as const;

export interface CreateMatchFormValues {
  courtId: number;
  date: string;
  time: string;
  duration: number;
  rosterMode: string;
  levelRequired: string;
  autoJoin: boolean;
  joinPolicy: string;
}

export function formatWizardDateLabel(isoDate: string, locale = 'es-AR'): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function halfHourTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return options;
}

export function createSpotsSummary(autoJoin: boolean): { filled: number; missing: number } {
  const filled = autoJoin ? 1 : 0;
  return { filled, missing: MATCH_MAX_PLAYERS - filled };
}

export function buildMatchDateIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function buildCreateMatchPayload(values: CreateMatchFormValues): CreateMatchPayload {
  return {
    court_id: values.courtId,
    date: buildMatchDateIso(values.date, values.time),
    duration: values.duration,
    roster_mode: values.rosterMode,
    level_required: values.levelRequired,
    auto_join: values.autoJoin,
    join_policy: values.joinPolicy,
  };
}

export function nextWizardStep(step: CreateWizardStep): CreateWizardStep | null {
  const index = CREATE_WIZARD_STEPS.indexOf(step);
  if (index < 0 || index >= CREATE_WIZARD_STEPS.length - 1) {
    return null;
  }
  return CREATE_WIZARD_STEPS[index + 1];
}

export function wizardStepIndex(step: CreateWizardStep): number {
  return CREATE_WIZARD_STEPS.indexOf(step) + 1;
}

export function truncateCompletedFrom(
  completed: Set<CreateWizardStep>,
  fromStep: CreateWizardStep,
): Set<CreateWizardStep> {
  const fromIndex = CREATE_WIZARD_STEPS.indexOf(fromStep);
  const next = new Set<CreateWizardStep>();
  for (const step of completed) {
    if (CREATE_WIZARD_STEPS.indexOf(step) < fromIndex) {
      next.add(step);
    }
  }
  return next;
}
