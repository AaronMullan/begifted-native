/** Match YYYY-MM-DD so we only treat explicit ISO dates as valid. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Match --MM-DD (vCard partial date used when birth year is unknown). */
const MONTH_DAY_NO_YEAR = /^--(\d{2})-(\d{2})$/;

/** True if `date` is before today (comparing calendar dates only, not times). */
function hasPassed(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/** Format a Date as YYYY-MM-DD. */
function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse a YYYY-MM-DD string as a local date. Constructing via
 * `new Date(y, m - 1, d)` (never `new Date(isoString)`) keeps the calendar
 * day intact — the ISO-string constructor parses as UTC and shifts the day
 * for timezones west of Greenwich. Returns null for anything but a full date.
 */
export function parseISODateLocal(isoDate: string): Date | null {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** True if the given 1-based month and day form a real calendar date. */
export function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Use a leap year so Feb 29 is accepted for annual occasions.
  const probe = new Date(2024, month - 1, day);
  return probe.getMonth() === month - 1 && probe.getDate() === day;
}

/**
 * Display formatting for occasion dates: "July 7" (default) or "Jul 7".
 * Accepts a YYYY-MM-DD string or an already-parsed Date. An unparseable
 * string is returned as-is so a malformed value stays visible instead of
 * rendering "Invalid Date"; null/undefined (an undated occasion) renders "".
 */
export function formatOccasionDate(
  date: string | Date | null | undefined,
  options: { month?: "long" | "short" } = {}
): string {
  if (date == null) return "";
  const parsed = typeof date === "string" ? parseISODateLocal(date) : date;
  if (!parsed) return typeof date === "string" ? date : "";
  return parsed.toLocaleDateString("en-US", {
    month: options.month ?? "long",
    day: "numeric",
  });
}

/**
 * Return the next occurrence of a calendar date (month/day). If the input
 * carries a year and falls today or in the future, return it unchanged;
 * otherwise (or when the year is unknown) return the next future YYYY-MM-DD
 * with the same month/day. Accepts YYYY-MM-DD or the vCard --MM-DD form.
 */
export function getNextOccurrence(isoDateStr: string): string {
  const noYear = MONTH_DAY_NO_YEAR.exec(isoDateStr);
  if (noYear) {
    return nextOccurrenceOfMonthDay(Number(noYear[1]), Number(noYear[2]));
  }
  if (!ISO_DATE_ONLY.test(isoDateStr)) {
    return isoDateStr;
  }
  const [y, m, d] = isoDateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) {
    return isoDateStr;
  }
  if (!hasPassed(date)) {
    return isoDateStr;
  }
  return nextOccurrenceOfMonthDay(m, d);
}

/**
 * Next occurrence of an annual occasion's month/day, ignoring any year in the
 * input. For annual occasions (birthdays, anniversaries) the stored year
 * carries no signal, and AI-extracted dates can arrive with a spurious future
 * year — getNextOccurrence would keep "2027-08-18" verbatim even when the next
 * real occurrence is 2026-08-18. Accepts YYYY-MM-DD or --MM-DD; anything else
 * is returned unchanged.
 */
export function getNextAnnualOccurrence(isoDateStr: string): string {
  const noYear = MONTH_DAY_NO_YEAR.exec(isoDateStr);
  if (noYear) {
    return nextOccurrenceOfMonthDay(Number(noYear[1]), Number(noYear[2]));
  }
  if (!ISO_DATE_ONLY.test(isoDateStr)) {
    return isoDateStr;
  }
  const [y, m, d] = isoDateStr.split("-").map(Number);
  if (Number.isNaN(new Date(y, m - 1, d).getTime())) {
    return isoDateStr;
  }
  return nextOccurrenceOfMonthDay(m, d);
}

function nextOccurrenceOfMonthDay(month: number, day: number): string {
  const today = new Date();
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  return hasPassed(thisYear)
    ? toISO(new Date(today.getFullYear() + 1, month - 1, day))
    : toISO(thisYear);
}

/**
 * Sanitize an AI-extracted occasion date at a save boundary. Extraction uses
 * January 1 as a placeholder when it can't resolve a real date, so a Jan-1
 * value for anything but New Year's (which resolves through the lookup first)
 * is noise, not signal. Known types resolve through lookupOccasionDate
 * regardless of the supplied date; unknown types keep a real ISO date (rolled
 * to its next occurrence) and anything else becomes null. Never run this on
 * user-typed dates — a person who deliberately dates a custom occasion Jan 1
 * is authoritative.
 */
export function sanitizeExtractedOccasionDate(
  occasionType: string,
  date: string | null | undefined
): string | null {
  const lookedUp = lookupOccasionDate(occasionType);
  if (lookedUp) return lookedUp;
  const raw = date?.trim() ?? "";
  if (!ISO_DATE_ONLY.test(raw)) return null;
  if (raw.endsWith("-01-01")) return null;
  return getNextOccurrence(raw);
}

/**
 * Lookup the date for an occasion type. Handles both fixed-date holidays
 * and variable holidays (Easter, Thanksgiving, Kwanzaa, etc.)
 *
 * @param occasionType - The occasion type (e.g., "easter", "thanksgiving", "kwanzaa", "anniversary")
 * @param year - Optional. When given, returns that year's exact date (even in
 *   the past); when omitted, returns the next occurrence from today.
 * @returns ISO date string (YYYY-MM-DD) or null if occasion type is unknown/user-specific
 */
export function lookupOccasionDate(
  occasionType: string,
  year?: number
): string | null {
  // Strip curly apostrophes too — iOS keyboards type "Mother’s Day".
  const normalized = occasionType
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_");
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;

  // Fixed-date holidays lookup
  const fixedHolidays: Record<string, { month: number; day: number }> = {
    christmas: { month: 12, day: 25 },
    christmas_day: { month: 12, day: 25 },
    valentines_day: { month: 2, day: 14 },
    "valentine's_day": { month: 2, day: 14 },
    new_years_day: { month: 1, day: 1 },
    new_years: { month: 1, day: 1 },
    independence_day: { month: 7, day: 4 },
    halloween: { month: 10, day: 31 },
    groundhog_day: { month: 2, day: 2 },
    st_patricks_day: { month: 3, day: 17 },
    "st_patrick's_day": { month: 3, day: 17 },
    cinco_de_mayo: { month: 5, day: 5 },
    juneteenth: { month: 6, day: 19 },
    veterans_day: { month: 11, day: 11 },
    kwanzaa: { month: 12, day: 26 },
    kwanza: { month: 12, day: 26 },
    makar_sankranti: { month: 1, day: 14 },
    vaisakhi: { month: 4, day: 14 },
    baisakhi: { month: 4, day: 14 },
  };

  // Check fixed holidays first
  if (fixedHolidays[normalized]) {
    const { month, day } = fixedHolidays[normalized];
    const thisYear = new Date(currentYear, month - 1, day);
    const targetYearToUse =
      !year && hasPassed(thisYear) ? currentYear + 1 : targetYear;
    return toISO(new Date(targetYearToUse, month - 1, day));
  }

  // Variable holidays that need calculation. Calculators are exact for the
  // requested year; only a today-relative lookup (no explicit year) rolls a
  // passed date forward to the next year's occurrence.
  const calculator = VARIABLE_HOLIDAY_CALCULATORS[normalized];
  if (!calculator) return null;
  const resolved = calculator(targetYear);
  if (!year) {
    const parsed = parseISODateLocal(resolved);
    if (parsed && hasPassed(parsed)) return calculator(targetYear + 1);
  }
  return resolved;
}

const VARIABLE_HOLIDAY_CALCULATORS: Record<string, (year: number) => string> = {
  easter: calculateEasterDate,
  thanksgiving: calculateThanksgivingDate,
  mothers_day: calculateMothersDayDate,
  mothersday: calculateMothersDayDate,
  fathers_day: calculateFathersDayDate,
  fathersday: calculateFathersDayDate,
  spring_equinox: calculateSpringEquinox,
  vernal_equinox: calculateSpringEquinox,
  autumn_equinox: calculateAutumnEquinox,
  fall_equinox: calculateAutumnEquinox,
  summer_solstice: calculateSummerSolstice,
  winter_solstice: calculateWinterSolstice,
  diwali: calculateDiwaliDate,
  holi: calculateHoliDate,
  hanukkah: calculateHanukkahDate,
  chanukah: calculateHanukkahDate,
  lunar_new_year: calculateLunarNewYearDate,
  chinese_new_year: calculateLunarNewYearDate,
  // lookupOccasionDate only collapses whitespace, so a typed "Eid al-Fitr"
  // normalizes with its hyphen intact; slugifyOccasionName turns the same
  // label into eid_al_fitr. Both spellings have to resolve.
  eid_al_fitr: calculateEidAlFitrDate,
  "eid_al-fitr": calculateEidAlFitrDate,
  eid_ul_fitr: calculateEidAlFitrDate,
  "eid_ul-fitr": calculateEidAlFitrDate,
  eid_al_adha: calculateEidAlAdhaDate,
  "eid_al-adha": calculateEidAlAdhaDate,
  eid_ul_adha: calculateEidAlAdhaDate,
  "eid_ul-adha": calculateEidAlAdhaDate,
  // Bare "Eid" resolves to al-Fitr: it closes Ramadan and is the Eid people
  // most often exchange gifts on.
  eid: calculateEidAlFitrDate,
  record_store_day: (year) => calculateThirdSaturdayOfMonth(year, 4),
};

// ── Variable holiday calculators ──────────────────────────────────────
// Each calculator returns the exact date for the requested year; rolling a
// passed date to next year happens centrally in lookupOccasionDate so an
// explicit-year request (e.g. the calendar projecting a viewed year) stays
// exact.

// Easter (Anonymous Gregorian algorithm, works 1900-2099)
function calculateEasterDate(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(new Date(year, month - 1, day));
}

// Thanksgiving (4th Thursday of November)
function calculateThanksgivingDate(year: number): string {
  const nov1 = new Date(year, 10, 1);
  const dow = nov1.getDay();
  const daysToAdd = dow <= 4 ? 4 - dow : 11 - dow;
  return toISO(new Date(year, 10, 1 + daysToAdd + 21));
}

// Nth Saturday of a month (e.g. Record Store Day = 3rd Saturday of April)
function calculateThirdSaturdayOfMonth(year: number, month: number): string {
  const first = new Date(year, month - 1, 1);
  const daysToFirstSat = (6 - first.getDay() + 7) % 7;
  return toISO(new Date(year, month - 1, 1 + daysToFirstSat + 14));
}

// Mother's Day (2nd Sunday of May)
function calculateMothersDayDate(year: number): string {
  const may1 = new Date(year, 4, 1);
  const daysToAdd = (7 - may1.getDay()) % 7;
  return toISO(new Date(year, 4, 1 + daysToAdd + 7));
}

// Father's Day (3rd Sunday of June)
function calculateFathersDayDate(year: number): string {
  const jun1 = new Date(year, 5, 1);
  const daysToAdd = (7 - jun1.getDay()) % 7;
  return toISO(new Date(year, 5, 1 + daysToAdd + 14));
}

// ── Equinox / Solstice (Meeus algorithm, accurate 1951-2050) ──────────

function meeusDate(jde: number): Date {
  return new Date((jde - 2440587.5) * 86400000);
}

function calculateSpringEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451623.80984 +
    365242.37404 * y +
    0.05169 * y * y -
    0.00411 * y ** 3 -
    0.00057 * y ** 4;
  return toISO(meeusDate(jde));
}

function calculateAutumnEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451810.21715 +
    365242.01767 * y -
    0.11575 * y * y +
    0.00337 * y ** 3 +
    0.00078 * y ** 4;
  return toISO(meeusDate(jde));
}

function calculateSummerSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451716.56767 +
    365241.62603 * y +
    0.00325 * y * y +
    0.00888 * y ** 3 -
    0.0003 * y ** 4;
  return toISO(meeusDate(jde));
}

function calculateWinterSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451900.05952 +
    365242.74049 * y -
    0.06223 * y * y -
    0.00823 * y ** 3 +
    0.00032 * y ** 4;
  return toISO(meeusDate(jde));
}

// ── Lunar-calendar holidays (lookup tables + approximation fallback) ──

/**
 * Every calculator must return a date inside the year it was asked for.
 * lookupOccasionDate rolls a passed date forward exactly once, so a fallback
 * that wanders out of the requested year leaves that single roll unable to
 * reach a future date — callers that trust the result as upcoming
 * (AddMomentDrawer's save, utils/upcoming-occasion) then take a date in the
 * past. The two fallbacks below each guarantee the in-year property.
 */

/** Add days without crossing DST wrong — always lands on local midnight. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Fallback for a lunisolar holiday (Hanukkah, Diwali, Holi, Lunar New Year)
 * past the end of its table: the season's anchor day in the requested year.
 * These are pinned to a season and wobble inside a ~30-day window, so a fixed
 * anchor is off by weeks at worst. A per-year drift term would instead walk
 * the holiday clean out of its season — Hanukkah landing in February.
 */
function lookupOrApproximate(
  year: number,
  table: Record<number, string>,
  fallbackMonth: number,
  fallbackDay: number
): string {
  return table[year] ?? toISO(new Date(year, fallbackMonth, fallbackDay));
}

/** Mean length of a 12-month Islamic year. */
const LUNAR_YEAR_DAYS = 354.367;

/**
 * Fallback for a purely lunar (Islamic) holiday past the end of its table:
 * step whole lunar years from the nearest tabulated date until the result
 * lands in the requested Gregorian year. The lunar year is ~11 days short of
 * the Gregorian one, so a year occasionally holds two occurrences — this takes
 * the first — and never zero, which is why the walk terminates.
 */
function lookupOrStepLunarYears(
  year: number,
  table: Record<number, string>
): string {
  const exact = table[year];
  if (exact) return exact;
  const anchorYear = Object.keys(table)
    .map(Number)
    .reduce((a, b) => (Math.abs(b - year) < Math.abs(a - year) ? b : a));
  const anchor = parseISODateLocal(table[anchorYear]);
  if (!anchor) return toISO(new Date(year, 0, 1));
  const at = (steps: number) =>
    addDays(anchor, Math.round(steps * LUNAR_YEAR_DAYS));
  const direction = year >= anchorYear ? 1 : -1;
  for (let steps = 0; Math.abs(steps) <= 400; steps += direction) {
    const candidate = at(steps);
    if (candidate.getFullYear() === year) return toISO(candidate);
  }
  return toISO(new Date(year, 0, 1));
}

function calculateDiwaliDate(year: number): string {
  return lookupOrApproximate(
    year,
    {
      2024: "2024-11-01",
      2025: "2025-10-20",
      2026: "2026-11-08",
      2027: "2027-10-28",
      2028: "2028-10-17",
      2029: "2029-11-05",
      2030: "2030-10-26",
    },
    9,
    15
  );
}

function calculateHoliDate(year: number): string {
  return lookupOrApproximate(
    year,
    {
      2024: "2024-03-25",
      2025: "2025-03-14",
      2026: "2026-03-03",
      2027: "2027-03-22",
      2028: "2028-03-11",
      2029: "2029-03-01",
      2030: "2030-03-20",
    },
    2,
    15
  );
}

function calculateHanukkahDate(year: number): string {
  return lookupOrApproximate(
    year,
    {
      2024: "2024-12-25",
      2025: "2025-12-14",
      2026: "2026-12-04",
      2027: "2027-12-24",
      2028: "2028-12-12",
      2029: "2029-12-01",
      2030: "2030-12-20",
    },
    11,
    10
  );
}

function calculateLunarNewYearDate(year: number): string {
  return lookupOrApproximate(
    year,
    {
      2024: "2024-02-10",
      2025: "2025-01-29",
      2026: "2026-02-17",
      2027: "2027-02-06",
      2028: "2028-01-26",
      2029: "2029-02-13",
      2030: "2030-02-03",
      2031: "2031-01-23",
      2032: "2032-02-11",
      2033: "2033-01-31",
      2034: "2034-02-19",
      2035: "2035-02-08",
    },
    1,
    5
  );
}

// Eid dates are astronomical estimates; the observed day can shift by one
// either way on local moon sighting. Close enough to put a gift reminder on,
// and far better than making the user look the date up themselves. The table
// stops at 2032 because 1454 AH puts two Eid al-Fitrs inside 2033, which a
// year-keyed table can't express.
function calculateEidAlFitrDate(year: number): string {
  return lookupOrStepLunarYears(year, {
    2024: "2024-04-10",
    2025: "2025-03-30",
    2026: "2026-03-20",
    2027: "2027-03-09",
    2028: "2028-02-26",
    2029: "2029-02-14",
    2030: "2030-02-04",
    2031: "2031-01-25",
    2032: "2032-01-14",
  });
}

function calculateEidAlAdhaDate(year: number): string {
  return lookupOrStepLunarYears(year, {
    2024: "2024-06-16",
    2025: "2025-06-06",
    2026: "2026-05-27",
    2027: "2027-05-16",
    2028: "2028-05-05",
    2029: "2029-04-24",
    2030: "2030-04-13",
    2031: "2031-04-02",
    2032: "2032-03-22",
  });
}
