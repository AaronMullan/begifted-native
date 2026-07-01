/**
 * Date helpers for the Moments calendar grid. The Figma design lays the month
 * out Monday-first with leading/trailing days from the adjacent months shown
 * dimmed, so the grid is always whole weeks.
 */

export type CalendarCell = {
  date: Date;
  /** False for the leading/trailing days that belong to the adjacent month. */
  inMonth: boolean;
};

/**
 * Day key in local time (YYYY-MM-DD). Occasion dates that are date-only
 * ("2026-06-18") are read straight from the string so a negative UTC offset
 * can't shift a birthday to the previous day; full ISO timestamps fall back to
 * the local calendar day.
 */
export function occasionDayKey(isoDate: string): string {
  const dateOnly = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  return dayKey(new Date(isoDate));
}

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Whole-week rows (Monday-first) covering the given month. */
export function buildMonthWeeks(monthDate: Date): CalendarCell[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  // JS getDay() is Sunday-first (0=Sun); shift so Monday=0.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);

  const weeks: CalendarCell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(year, month, 1 - firstWeekday + w * 7 + d);
      week.push({ date, inMonth: date.getMonth() === month });
    }
    weeks.push(week);
  }
  return weeks;
}

export const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
