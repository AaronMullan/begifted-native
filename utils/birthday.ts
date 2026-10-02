/**
 * Birthdays in BeGifted are stored as text on `recipients.birthday` in one
 * of three canonical forms:
 *
 *   - "YYYY-MM-DD"       when the full date (including year) is known
 *   - "--MM-DD"          when only the month and day are known (RFC 6350 / vCard)
 *   - "--MM-DD/--MM-DD"  when only approximate timing is known ("second week
 *                        of March"). The range is the birthday as told; its
 *                        start is a planning anchor, never the birthday itself.
 *
 * The column was originally a Postgres `date`, which rejected year 0 with
 * SQLSTATE 22008 (the bug PM hit) and couldn't represent partial dates at
 * all. The 2026-05-18 migration loosened it to text so we own validation.
 */
const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY_NO_YEAR = /^--(\d{2})-(\d{2})$/;
const MONTH_DAY_LOOSE = /^(\d{1,2})[-/](\d{1,2})$/;
// US-customary month-day-year entry (08-18-1990 or 8/18/1990).
const MDY_DATE = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;

// Customary "Month Day, Year" / "Month Day" forms — both full and 3-letter
// month names. This is the shape formatBirthdayDisplay() emits, so seeding an
// editable field with the friendly display still round-trips on save (DEV-178).
const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};
const MONTH_NAME_DATE = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?$/;

// Approximate timing, stored ("--03-08/--03-14") or as extraction returns it
// ("03-08/03-14").
const MONTH_DAY_RANGE = /^(?:--)?(\d{2})-(\d{2})\/(?:--)?(\d{2})-(\d{2})$/;
// The shapes formatBirthdayDisplay() emits for a range, so a field seeded with
// one round-trips on save: "March 8–14", "March 28 – April 3", "March".
const MONTH_NAME_RANGE =
  /^([A-Za-z]+)\.?\s+(\d{1,2})\s*[-–—]\s*(?:([A-Za-z]+)\.?\s+)?(\d{1,2})$/;
const MONTH_NAME_ONLY = /^([A-Za-z]+)\.?$/;
// A range wider than a month is not timing anyone can plan a gift around.
const MAX_RANGE_DAYS = 31;

const MIN_YEAR = 1850;

export interface BirthdayParts {
  year: number | null;
  month: number;
  day: number;
}

function isRealMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Use a leap year (2024) so Feb 29 is allowed for year-unknown birthdays.
  const probe = new Date(Date.UTC(2024, month - 1, day));
  return (
    probe.getUTCFullYear() === 2024 &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function isRealFullDate(year: number, month: number, day: number): boolean {
  if (!isRealMonthDay(month, day)) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Validate a (year?, month, day) triple into BirthdayParts. Year 0000 is the
 * LLM's tell for "I know the month/day but not the year" — repair it to the
 * canonical year-unknown form rather than rejecting, so the user doesn't have
 * to re-enter a known date just because the model couldn't represent a
 * missing field.
 */
function partsFromNumbers(
  year: number | null,
  month: number,
  day: number
): BirthdayParts | null {
  if (year === null || year === 0) {
    if (!isRealMonthDay(month, day)) return null;
    return { year: null, month, day };
  }
  if (year < MIN_YEAR) return null;
  if (year > new Date().getFullYear()) return null;
  if (!isRealFullDate(year, month, day)) return null;
  return { year, month, day };
}

/**
 * Parse a stored or user-supplied birthday string into its components.
 * Returns null if the input isn't a recognizable birthday in any form.
 */
export function parseBirthdayParts(
  input: string | null | undefined
): BirthdayParts | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const full = FULL_DATE.exec(trimmed);
  if (full) {
    return partsFromNumbers(Number(full[1]), Number(full[2]), Number(full[3]));
  }

  const mdy = MDY_DATE.exec(trimmed);
  if (mdy) {
    return partsFromNumbers(Number(mdy[3]), Number(mdy[1]), Number(mdy[2]));
  }

  const md = MONTH_DAY_NO_YEAR.exec(trimmed) ?? MONTH_DAY_LOOSE.exec(trimmed);
  if (md) {
    return partsFromNumbers(null, Number(md[1]), Number(md[2]));
  }

  const named = MONTH_NAME_DATE.exec(trimmed);
  if (named) {
    const month = MONTH_NAMES[named[1].toLowerCase()];
    if (!month) return null;
    return partsFromNumbers(
      named[3] ? Number(named[3]) : null,
      month,
      Number(named[2])
    );
  }

  return null;
}

export interface BirthdayRange {
  start: { month: number; day: number };
  end: { month: number; day: number };
}

// Leap-year length, matching isRealMonthDay, so February 29 stays in range.
function lastDayOfMonth(month: number): number {
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

function dayOfLeapYear(month: number, day: number): number {
  return (Date.UTC(2024, month - 1, day) - Date.UTC(2024, 0, 1)) / 86_400_000;
}

function rangeFromNumbers(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): BirthdayRange | null {
  if (!isRealMonthDay(startMonth, startDay)) return null;
  if (!isRealMonthDay(endMonth, endDay)) return null;
  const start = dayOfLeapYear(startMonth, startDay);
  const end = dayOfLeapYear(endMonth, endDay);
  // An end before the start wraps the new year ("December 28 – January 3").
  const span = (end >= start ? end - start : end + 366 - start) + 1;
  if (span < 2 || span > MAX_RANGE_DAYS) return null;
  return {
    start: { month: startMonth, day: startDay },
    end: { month: endMonth, day: endDay },
  };
}

/**
 * Parse an approximate birthday — stored, as extracted, or as displayed —
 * into its bounds. Null for an exact birthday or anything unrecognizable.
 * parseBirthdayParts deliberately stays exact-only: its callers compute ages
 * and single dates, and must read a range as "no exact birthday".
 */
export function parseBirthdayRange(
  input: string | null | undefined
): BirthdayRange | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const numeric = MONTH_DAY_RANGE.exec(trimmed);
  if (numeric) {
    return rangeFromNumbers(
      Number(numeric[1]),
      Number(numeric[2]),
      Number(numeric[3]),
      Number(numeric[4])
    );
  }

  const named = MONTH_NAME_RANGE.exec(trimmed);
  if (named) {
    const startMonth = MONTH_NAMES[named[1].toLowerCase()];
    const endMonth = named[3]
      ? MONTH_NAMES[named[3].toLowerCase()]
      : startMonth;
    if (!startMonth || !endMonth) return null;
    return rangeFromNumbers(
      startMonth,
      Number(named[2]),
      endMonth,
      Number(named[4])
    );
  }

  const monthOnly = MONTH_NAME_ONLY.exec(trimmed);
  if (monthOnly) {
    const month = MONTH_NAMES[monthOnly[1].toLowerCase()];
    if (!month) return null;
    return rangeFromNumbers(month, 1, month, lastDayOfMonth(month));
  }

  return null;
}

/** True when `range` is an approximate birthday and `exact`'s day is in it. */
export function birthdayRangeContains(
  range: string | null | undefined,
  exact: string | null | undefined
): boolean {
  const bounds = parseBirthdayRange(range);
  const parts = parseBirthdayParts(exact);
  if (!bounds || !parts) return false;
  const start = dayOfLeapYear(bounds.start.month, bounds.start.day);
  const end = dayOfLeapYear(bounds.end.month, bounds.end.day);
  const day = dayOfLeapYear(parts.month, parts.day);
  return end >= start ? day >= start && day <= end : day >= start || day <= end;
}

/**
 * The month/day ("--MM-DD") to plan around: an exact birthday's own day, or
 * the first day of an approximate one. For dating the birthday moment only —
 * never store or show it as the birthday.
 */
export function birthdayPlanningAnchor(
  birthday: string | null | undefined
): string | null {
  const range = parseBirthdayRange(birthday);
  const monthDay = range?.start ?? parseBirthdayParts(birthday);
  if (!monthDay) return null;
  const mm = String(monthDay.month).padStart(2, "0");
  const dd = String(monthDay.day).padStart(2, "0");
  return `--${mm}-${dd}`;
}

/**
 * Normalize user/LLM input into the canonical storage form, or null if the
 * input is unparseable. Use at the save boundary so we never write garbage
 * into recipients.birthday.
 */
export function normalizeBirthday(
  input: string | null | undefined
): string | null {
  const range = parseBirthdayRange(input);
  if (range) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `--${pad(range.start.month)}-${pad(range.start.day)}/--${pad(range.end.month)}-${pad(range.end.day)}`;
  }
  const parts = parseBirthdayParts(input);
  if (!parts) return null;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  if (parts.year === null) return `--${mm}-${dd}`;
  return `${parts.year}-${mm}-${dd}`;
}

/**
 * True when the user typed something non-empty that we can't parse. UI uses
 * this to surface inline help without blocking save (save proceeds with
 * birthday=null when normalization fails).
 */
export function isInvalidBirthdayInput(
  input: string | null | undefined
): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  return normalizeBirthday(trimmed) === null;
}

/**
 * Human-readable display string. Returns "" if the birthday isn't parseable
 * so callers can drop it cleanly.
 */
export function formatBirthdayDisplay(
  birthday: string | null | undefined,
  options: { includeYearWhenKnown?: boolean } = {}
): string {
  const range = parseBirthdayRange(birthday);
  if (range) return formatBirthdayRange(range);
  const parts = parseBirthdayParts(birthday);
  if (!parts) return "";
  // Year here is a placeholder for Date — we only use month/day for display
  // when year is unknown, so the dummy year never reaches the user.
  const date = new Date(parts.year ?? 2000, parts.month - 1, parts.day);
  const includeYear =
    (options.includeYearWhenKnown ?? true) && parts.year !== null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

/**
 * What to show in place of a birthday moment's date when the birthday is
 * approximate ("March 8–14"), or null for any other moment. The moment row is
 * dated on the planning anchor because its column holds a single day; that
 * day is not the birthday and must not be shown as one.
 */
export function approximateBirthdayLabel(
  occasionType: string,
  birthday: string | null | undefined
): string | null {
  if (occasionType !== "birthday") return null;
  const range = parseBirthdayRange(birthday);
  return range ? formatBirthdayRange(range) : null;
}

/**
 * Timing line for an approximate birthday, used where an exact date gets a
 * countdown. A countdown to the anchor would claim a day nobody gave.
 */
export function approximateTimingPhrase(label: string): string {
  // A whole-month range formats as the bare month name.
  return /\d/.test(label) ? `Around ${label}` : `Sometime in ${label}`;
}

function formatBirthdayRange(range: BirthdayRange): string {
  const monthName = (month: number) =>
    new Date(2000, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
  const { start, end } = range;
  if (start.month !== end.month) {
    return `${monthName(start.month)} ${start.day} – ${monthName(end.month)} ${end.day}`;
  }
  // Extraction may close February on the 28th.
  const wholeMonth =
    start.day === 1 &&
    (end.day === lastDayOfMonth(start.month) ||
      (start.month === 2 && end.day === 28));
  return wholeMonth
    ? monthName(start.month)
    : `${monthName(start.month)} ${start.day}–${end.day}`;
}

/** True when the stored birthday includes a year (vs. month-day only). */
export function birthdayHasYear(birthday: string | null | undefined): boolean {
  const parts = parseBirthdayParts(birthday);
  return parts !== null && parts.year !== null;
}

/**
 * Backfill a birth year from a user-volunteered current age (DEV-105). When
 * someone says "he's 47" in the update chat we have no birth date to anchor on,
 * so we approximate one. Age is a derived value, not a stored one — the synopsis
 * recomputes it from this year every time, so an off-by-one is harmless and far
 * better than a wrong LLM-invented age.
 *
 * Rules:
 *   - If we already know the full birthday (year included), the age claim is
 *     redundant — trust the stored date and return null (no change).
 *   - If we know only month/day, backfill the year onto it.
 *   - If we know nothing, store nothing here. A synthetic Jan-1 date reads as
 *     a real birthday to every downstream consumer — the cron re-dates the
 *     birthday occasion to Jan 1 from it. The age still gets persisted, as
 *     recipients.birth_year via birthYearFromAge.
 *
 * Returns the normalized birthday string to persist, or null when nothing
 * should change (already have a year, no month/day to anchor the year to,
 * or the age is implausible).
 */
export function backfillBirthdayFromAge(
  age: number | null | undefined,
  existingBirthday: string | null | undefined
): string | null {
  if (age == null || !Number.isFinite(age)) return null;
  const rounded = Math.round(age);
  if (rounded <= 0 || rounded > 130) return null;

  const parts = parseBirthdayParts(existingBirthday);
  // Already know the real birth year — don't overwrite the truth with a guess.
  if (parts && parts.year !== null) return null;
  // No month/day to anchor the year to — refuse to fabricate one.
  if (!parts) return null;

  // "He's 64" is the age today. If this year's birthday is still ahead, the
  // 64th birthday was last year's, so the birth year is one earlier than the
  // plain subtraction gives.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthdayThisYear = new Date(
    now.getFullYear(),
    parts.month - 1,
    parts.day
  );
  const year = now.getFullYear() - rounded - (birthdayThisYear > today ? 1 : 0);
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return normalizeBirthday(`${year}-${mm}-${dd}`);
}

/**
 * A bare year ("1961") is what extraction returns when the user gave the
 * birth year but no month/day. It is not a birthday (normalizeBirthday
 * rejects it) but it is a birth year, so it belongs on recipients.birth_year.
 */
export function birthYearFromYearOnly(
  input: string | null | undefined
): number | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  const year = Number(trimmed);
  if (year < MIN_YEAR || year > new Date().getFullYear()) return null;
  return year;
}

/**
 * Recipient birthday implied by a birthday occasion the user dated by hand.
 * People enter the birth date itself ("07-28-1953") on the occasions screen,
 * so a year in the past is the birth year; a current or future year is just
 * the next occurrence and carries no birth year.
 */
export function birthdayFromOccasionDate(
  date: string | null | undefined
): string | null {
  // Not parseBirthdayParts: an occasion date can legitimately carry next
  // year's date, which the birthday parser rejects as a future birth year.
  const trimmed = (date ?? "").trim();
  const full = FULL_DATE.exec(trimmed);
  const noYear = MONTH_DAY_NO_YEAR.exec(trimmed);
  if (!full && !noYear) return null;
  const year = full ? Number(full[1]) : null;
  const month = Number(full ? full[2] : noYear![1]);
  const day = Number(full ? full[3] : noYear![2]);
  if (!isRealMonthDay(month, day)) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const birthYear =
    year !== null && year >= MIN_YEAR && year < new Date().getFullYear()
      ? year
      : null;
  return birthYear === null ? `--${mm}-${dd}` : `${birthYear}-${mm}-${dd}`;
}

/**
 * Recipient birthday to persist after the user re-dates a birthday moment, or
 * null when it already agrees (or the date is unparseable). The gift cron
 * re-dates birthday occasions from recipients.birthday, so an edit that only
 * touches the occasion is reverted the next time the cron runs. A birth year
 * already on file is kept unless the entered date carries a past year of its
 * own. `dateTyped` says the user entered the date, as opposed to a save that
 * carries the moment's stored date along unchanged.
 */
export function birthdayAfterOccasionEdit(
  occasionDate: string | null | undefined,
  existingBirthday: string | null | undefined,
  dateTyped = false
): string | null {
  const fromOccasion = parseBirthdayParts(
    birthdayFromOccasionDate(occasionDate)
  );
  if (!fromOccasion) return null;
  // The moment of an approximate birthday is dated on its planning anchor.
  // Saving the moment with that date unchanged says nothing new about the
  // birthday, and must not harden the anchor into an exact day. Typing that
  // same day is the user saying the birthday falls on it.
  const existingRange = parseBirthdayRange(existingBirthday);
  if (
    !dateTyped &&
    existingRange &&
    fromOccasion.year === null &&
    fromOccasion.month === existingRange.start.month &&
    fromOccasion.day === existingRange.start.day
  ) {
    return null;
  }
  const existing = parseBirthdayParts(existingBirthday);
  const mm = String(fromOccasion.month).padStart(2, "0");
  const dd = String(fromOccasion.day).padStart(2, "0");
  const year = fromOccasion.year ?? existing?.year ?? null;
  // Feb 29 against a known non-leap birth year can't be a full date.
  const next =
    (year !== null ? normalizeBirthday(`${year}-${mm}-${dd}`) : null) ??
    `--${mm}-${dd}`;
  return next === normalizeBirthday(existingBirthday) ? null : next;
}

/**
 * Derive a birth year from a user-volunteered current age, for storage on
 * recipients.birth_year when no birthday month/day exists to anchor it to.
 * Same plausibility rules as backfillBirthdayFromAge. The year is stable
 * where a stored age would go stale; consumers recompute age from it.
 */
export function birthYearFromAge(
  age: number | null | undefined
): number | null {
  if (age == null || !Number.isFinite(age)) return null;
  const rounded = Math.round(age);
  if (rounded <= 0 || rounded > 130) return null;
  return new Date().getFullYear() - rounded;
}
