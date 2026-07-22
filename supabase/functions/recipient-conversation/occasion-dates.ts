/**
 * Deterministic date resolution for occasion candidates and discovery
 * anchors. Every date the app displays must come from here (or from
 * user-supplied data) — never from the model (DEV-310). Duplicates a
 * subset of the client's utils/occasion-dates.ts because edge functions
 * are deployed as a self-contained Deno bundle.
 */

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Match --MM-DD (vCard partial date used when birth year is unknown). */
const MONTH_DAY_NO_YEAR = /^--(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function todayISO(): string {
  return toISO(new Date());
}

/** True if `iso` (YYYY-MM-DD) is strictly before today. Lexicographic
 * comparison is safe for ISO dates. */
export function isPastISO(iso: string): boolean {
  return iso < todayISO();
}

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Next occurrence (today or later) of an annual month/day. */
export function nextOccurrenceOfMonthDay(month: number, day: number): string {
  const today = new Date();
  const year = today.getUTCFullYear();
  const thisYear = toISO(new Date(Date.UTC(year, month - 1, day)));
  return isPastISO(thisYear)
    ? toISO(new Date(Date.UTC(year + 1, month - 1, day)))
    : thisYear;
}

/**
 * Parse a birthday in YYYY-MM-DD or --MM-DD form.
 * Returns null for anything unparseable.
 */
export function parseBirthdayParts(
  birthday: string | null | undefined
): { year: number | null; month: number; day: number } | null {
  const raw = (birthday ?? "").trim();
  const noYear = MONTH_DAY_NO_YEAR.exec(raw);
  if (noYear) {
    return { year: null, month: Number(noYear[1]), day: Number(noYear[2]) };
  }
  if (!ISO_DATE_ONLY.test(raw)) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!m || !d) return null;
  return { year: y || null, month: m, day: d };
}

/**
 * Pull a concrete date out of a free-form string like
 * "wedding anniversary — September 22, 2001" or "graduation (2027-06-05)".
 * A found date in the past rolls to its next annual occurrence; a future
 * date (e.g. a one-time event) is kept verbatim. Returns null when no
 * date is present.
 */
export function extractFutureDate(text: string): string | null {
  const iso = /\d{4}-\d{2}-\d{2}/.exec(text);
  if (iso && isValidISODate(iso[0])) {
    const [, m, d] = iso[0].split("-").map(Number);
    return isPastISO(iso[0]) ? nextOccurrenceOfMonthDay(m, d) : iso[0];
  }
  const named =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i.exec(
      text
    );
  if (!named) return null;
  const month = MONTH_NAMES.indexOf(named[1].toLowerCase()) + 1;
  const day = Number(named[2]);
  const year = named[3] ? Number(named[3]) : null;
  if (day < 1 || day > 31) return null;
  if (year) {
    const exact = toISO(new Date(Date.UTC(year, month - 1, day)));
    return isPastISO(exact) ? nextOccurrenceOfMonthDay(month, day) : exact;
  }
  return nextOccurrenceOfMonthDay(month, day);
}

/** Compute a variable-date occasion; if it has passed, recurse to next year. */
function nextOrRecurse(
  iso: string,
  calculator: (y: number) => string,
  year: number
): string {
  return isPastISO(iso) ? calculator(year + 1) : iso;
}

/** Nth occurrence of a weekday (0=Sun..6=Sat) in a month, as ISO. */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number
): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return toISO(new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7)));
}

export function nextNthWeekdayOfMonth(
  month: number,
  weekday: number,
  n: number
): string {
  const calc = (year: number): string =>
    nextOrRecurse(nthWeekdayOfMonth(year, month, weekday, n), calc, year);
  return calc(new Date().getUTCFullYear());
}

// Mother's Day (US): 2nd Sunday of May.
export function nextMothersDay(): string {
  return nextNthWeekdayOfMonth(5, 0, 2);
}

// Father's Day (US): 3rd Sunday of June.
export function nextFathersDay(): string {
  return nextNthWeekdayOfMonth(6, 0, 3);
}

// ── Equinox / Solstice (Meeus algorithm, accurate 1951-2050) ──────────

function meeusISO(jde: number): string {
  return toISO(new Date((jde - 2440587.5) * 86400000));
}

function springEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451623.80984 +
    365242.37404 * y +
    0.05169 * y * y -
    0.00411 * y ** 3 -
    0.00057 * y ** 4;
  return nextOrRecurse(meeusISO(jde), springEquinox, year);
}

function autumnEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451810.21715 +
    365242.01767 * y -
    0.11575 * y * y +
    0.00337 * y ** 3 +
    0.00078 * y ** 4;
  return nextOrRecurse(meeusISO(jde), autumnEquinox, year);
}

function summerSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451716.56767 +
    365241.62603 * y +
    0.00325 * y * y +
    0.00888 * y ** 3 -
    0.0003 * y ** 4;
  return nextOrRecurse(meeusISO(jde), summerSolstice, year);
}

function winterSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451900.05952 +
    365242.74049 * y -
    0.06223 * y * y -
    0.00823 * y ** 3 +
    0.00032 * y ** 4;
  return nextOrRecurse(meeusISO(jde), winterSolstice, year);
}

export function nextSpringEquinox(): string {
  return springEquinox(new Date().getUTCFullYear());
}
export function nextAutumnEquinox(): string {
  return autumnEquinox(new Date().getUTCFullYear());
}
export function nextSummerSolstice(): string {
  return summerSolstice(new Date().getUTCFullYear());
}
export function nextWinterSolstice(): string {
  return winterSolstice(new Date().getUTCFullYear());
}

// ── Lunar-calendar holidays (verified lookup tables; null when exhausted) ──

function nextFromTable(table: Record<number, string>): string | null {
  const year = new Date().getUTCFullYear();
  for (const y of [year, year + 1]) {
    const iso = table[y];
    if (iso && !isPastISO(iso)) return iso;
  }
  return null;
}

export function nextHanukkah(): string | null {
  return nextFromTable({
    2026: "2026-12-04",
    2027: "2027-12-24",
    2028: "2028-12-12",
    2029: "2029-12-01",
    2030: "2030-12-20",
  });
}

export function nextDiwali(): string | null {
  return nextFromTable({
    2026: "2026-11-08",
    2027: "2027-10-28",
    2028: "2028-10-17",
    2029: "2029-11-05",
    2030: "2030-10-26",
  });
}
