/**
 * Birthdays in BeGifted are stored as text on `recipients.birthday` in one
 * of two canonical forms:
 *
 *   - "YYYY-MM-DD"  when the full date (including year) is known
 *   - "--MM-DD"     when only the month and day are known (RFC 6350 / vCard)
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

/**
 * Normalize user/LLM input into the canonical storage form, or null if the
 * input is unparseable. Use at the save boundary so we never write garbage
 * into recipients.birthday.
 */
export function normalizeBirthday(
  input: string | null | undefined
): string | null {
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

  const year = new Date().getFullYear() - rounded;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return normalizeBirthday(`${year}-${mm}-${dd}`);
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
