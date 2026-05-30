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
const MONTH_DAY_LOOSE = /^(\d{1,2})-(\d{1,2})$/;

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
    const year = Number(full[1]);
    const month = Number(full[2]);
    const day = Number(full[3]);
    // Year 0000 is the LLM's tell for "I know the month/day but not the
    // year." Repair to the canonical year-unknown form rather than
    // rejecting — the user shouldn't have to re-enter a known date just
    // because the model couldn't represent a missing field.
    if (year === 0) {
      if (!isRealMonthDay(month, day)) return null;
      return { year: null, month, day };
    }
    if (year < MIN_YEAR) return null;
    if (year > new Date().getFullYear()) return null;
    if (!isRealFullDate(year, month, day)) return null;
    return { year, month, day };
  }

  const md = MONTH_DAY_NO_YEAR.exec(trimmed) ?? MONTH_DAY_LOOSE.exec(trimmed);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    if (!isRealMonthDay(month, day)) return null;
    return { year: null, month, day };
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
