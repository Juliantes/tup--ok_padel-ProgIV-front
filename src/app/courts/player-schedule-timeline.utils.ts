import { ClubScheduleRow, PlayerAvailabilityCell } from '../core/api/club.models';

export type TimelineSegmentKind = 'available' | 'booked' | 'match' | 'unavailable' | 'mine';

export interface TimelineSegment {
  kind: TimelineSegmentKind;
  startTime: string;
  endTime: string;
  leftPercent: number;
  widthPercent: number;
  timeSlotId: number | null;
  matchId: number | null;
}

export interface ScheduleHoursRange {
  startMinutes: number;
  endMinutes: number;
  startLabel: string;
  endLabel: string;
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function formatHourLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return String(hour).padStart(2, '0');
}

export function scheduleDayHoursRange(rows: ClubScheduleRow[]): ScheduleHoursRange | null {
  if (rows.length === 0) {
    return null;
  }

  let startMinutes = Number.POSITIVE_INFINITY;
  let endMinutes = Number.NEGATIVE_INFINITY;

  rows.forEach((row) => {
    startMinutes = Math.min(startMinutes, timeToMinutes(row.start_time));
    endMinutes = Math.max(endMinutes, timeToMinutes(row.end_time));
  });

  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);
  const alignedStart = startHour * 60;
  const alignedEnd = endHour * 60;

  return {
    startMinutes: alignedStart,
    endMinutes: alignedEnd,
    startLabel: `${String(startHour).padStart(2, '0')}:00`,
    endLabel: `${String(endHour).padStart(2, '0')}:00`,
  };
}

export function buildHourTicks(range: ScheduleHoursRange): number[] {
  const ticks: number[] = [];
  for (let hour = range.startMinutes / 60; hour <= range.endMinutes / 60; hour += 1) {
    ticks.push(hour);
  }
  return ticks;
}

export function segmentLayout(
  startTime: string,
  endTime: string,
  range: ScheduleHoursRange,
): { leftPercent: number; widthPercent: number } {
  const span = range.endMinutes - range.startMinutes;
  if (span <= 0) {
    return { leftPercent: 0, widthPercent: 0 };
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const leftPercent = ((start - range.startMinutes) / span) * 100;
  const widthPercent = ((end - start) / span) * 100;

  return { leftPercent, widthPercent };
}

export type TimelineCellResolver = (
  courtId: number,
  startTime: string,
) => PlayerAvailabilityCell | undefined;

export type TimelineMineResolver = (courtId: number, startTime: string) => boolean;

export type TimelineBookableResolver = (courtId: number, startTime: string) => boolean;

export function buildCourtTimelineSegments(
  courtId: number,
  rows: ClubScheduleRow[],
  range: ScheduleHoursRange,
  cellFor: TimelineCellResolver,
  isMine: TimelineMineResolver,
  canBook: TimelineBookableResolver,
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];

  let current: {
    kind: TimelineSegmentKind;
    startTime: string;
    endTime: string;
    timeSlotId: number | null;
    matchId: number | null;
  } | null = null;

  const flush = (): void => {
    if (!current) {
      return;
    }
    const layout = segmentLayout(current.startTime, current.endTime, range);
    segments.push({
      kind: current.kind,
      startTime: current.startTime,
      endTime: current.endTime,
      timeSlotId: current.timeSlotId,
      matchId: current.matchId,
      leftPercent: layout.leftPercent,
      widthPercent: layout.widthPercent,
    });
    current = null;
  };

  const kindFor = (
    cell: PlayerAvailabilityCell | undefined,
    startTime: string,
  ): TimelineSegmentKind | null => {
    if (!cell || cell.state === 'empty') {
      return null;
    }
    if (isMine(courtId, startTime)) {
      return 'mine';
    }
    if (cell.state === 'available' && canBook(courtId, startTime)) {
      return 'available';
    }
    if (cell.state === 'booked') {
      if (cell.match_id != null) {
        return 'match';
      }
      return 'booked';
    }
    return 'unavailable';
  };

  const mergeable = (
    kind: TimelineSegmentKind,
    cell: PlayerAvailabilityCell | undefined,
    matchId: number | null,
  ): boolean => {
    if (kind === 'available') {
      return current?.timeSlotId === (cell?.time_slot_id ?? null);
    }
    if (kind === 'match') {
      return current?.matchId === matchId;
    }
    return true;
  };

  rows.forEach((row) => {
    const cell = cellFor(courtId, row.start_time);
    const kind = kindFor(cell, row.start_time);
    if (kind === null) {
      flush();
      return;
    }

    const matchId = kind === 'match' ? (cell?.match_id ?? null) : null;

    if (
      current &&
      current.kind === kind &&
      current.endTime === row.start_time &&
      mergeable(kind, cell, matchId)
    ) {
      current.endTime = row.end_time;
      return;
    }

    flush();
    current = {
      kind,
      startTime: row.start_time,
      endTime: row.end_time,
      timeSlotId: cell?.time_slot_id ?? null,
      matchId,
    };
  });

  flush();
  return segments;
}

export function normalizeBookingDate(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function myBookingSlotKey(courtId: number, isoDate: string, startTime: string): string {
  return `${courtId}:${isoDate}:${startTime}`;
}
