import { ClubScheduleCell, ScheduleDateOption } from '../core/api/club.models';

const WEEKDAY_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function buildScheduleDateOptions(
  count = 7,
  fromIso = todayIsoDate(),
): ScheduleDateOption[] {
  const today = todayIsoDate();
  const options: ScheduleDateOption[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const isoDate = addDaysIso(fromIso, offset);
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    options.push({
      isoDate,
      weekdayLabel: WEEKDAY_SHORT[date.getDay()] ?? '',
      dayMonthLabel: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      isToday: isoDate === today,
    });
  }

  return options;
}

export function formatClubPrice(value: number, locale = 'es-AR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function scheduleCellKey(courtId: number, startTime: string): string {
  return `${courtId}:${startTime}`;
}

export function indexScheduleCells(cells: ClubScheduleCell[]): Map<string, ClubScheduleCell> {
  const map = new Map<string, ClubScheduleCell>();
  cells.forEach((cell) => {
    map.set(scheduleCellKey(cell.court_id, cell.start_time), cell);
  });
  return map;
}

export function whatsappClubUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('54') ? digits : `54${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
