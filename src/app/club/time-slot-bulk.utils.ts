export interface BulkTimeSlotInterval {
  start_time: string;
  end_time: string;
}

function parseMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Mirrors ok_padel TimeSlots::BulkReplace.build_intervals (clock times only). */
export function buildBulkSlotIntervals(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
): BulkTimeSlotInterval[] {
  const open = parseMinutes(openTime);
  const close = parseMinutes(closeTime);
  const duration = Math.round(durationMinutes);

  if (open === null || close === null || duration <= 0 || open >= close) {
    return [];
  }

  const intervals: BulkTimeSlotInterval[] = [];
  let cursor = open;
  while (cursor + duration <= close) {
    intervals.push({
      start_time: formatMinutes(cursor),
      end_time: formatMinutes(cursor + duration),
    });
    cursor += duration;
  }
  return intervals;
}

export function durationHoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}
