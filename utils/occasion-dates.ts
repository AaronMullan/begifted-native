/** Match YYYY-MM-DD so we only treat explicit ISO dates as valid. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

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
 * Return the next occurrence of a calendar date (month/day). If the given
 * date is today or in the future, return it; otherwise return the same
 * month/day in the next year. Input must be YYYY-MM-DD.
 */
export function getNextOccurrence(isoDateStr: string): string {
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
  const today = new Date();
  const next = new Date(today.getFullYear() + 1, m - 1, d);
  return toISO(next);
}

/**
 * Lookup the date for an occasion type. Handles both fixed-date holidays
 * and variable holidays (Easter, Thanksgiving, Kwanzaa, etc.)
 *
 * @param occasionType - The occasion type (e.g., "easter", "thanksgiving", "kwanzaa", "anniversary")
 * @param year - Optional year, defaults to current year or next year if date has passed
 * @returns ISO date string (YYYY-MM-DD) or null if occasion type is unknown/user-specific
 */
export function lookupOccasionDate(
  occasionType: string,
  year?: number
): string | null {
  const normalized = occasionType
    .toLowerCase()
    .trim()
    .replace(/'/g, "")
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

  // Variable holidays that need calculation
  switch (normalized) {
    case "easter":
      return calculateEasterDate(targetYear);
    case "thanksgiving":
      return calculateThanksgivingDate(targetYear);
    case "mothers_day":
    case "mothersday":
      return calculateMothersDayDate(targetYear);
    case "fathers_day":
    case "fathersday":
      return calculateFathersDayDate(targetYear);
    case "spring_equinox":
    case "vernal_equinox":
      return calculateSpringEquinox(targetYear);
    case "autumn_equinox":
    case "fall_equinox":
      return calculateAutumnEquinox(targetYear);
    case "summer_solstice":
      return calculateSummerSolstice(targetYear);
    case "winter_solstice":
      return calculateWinterSolstice(targetYear);
    case "diwali":
      return calculateDiwaliDate(targetYear);
    case "holi":
      return calculateHoliDate(targetYear);
    case "hanukkah":
    case "chanukah":
      return calculateHanukkahDate(targetYear);
    case "record_store_day":
      return calculateThirdSaturdayOfMonth(targetYear, 4);
    default:
      return null;
  }
}

// ── Variable holiday calculators ──────────────────────────────────────

/** Compute a variable-date holiday; if it has passed, recurse to next year. */
function nextOrRecurse(
  date: Date,
  calculator: (y: number) => string,
  year: number
): string {
  return hasPassed(date) ? calculator(year + 1) : toISO(date);
}

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
  return nextOrRecurse(new Date(year, month - 1, day), calculateEasterDate, year);
}

// Thanksgiving (4th Thursday of November)
function calculateThanksgivingDate(year: number): string {
  const nov1 = new Date(year, 10, 1);
  const dow = nov1.getDay();
  const daysToAdd = dow <= 4 ? 4 - dow : 11 - dow;
  return nextOrRecurse(
    new Date(year, 10, 1 + daysToAdd + 21),
    calculateThanksgivingDate,
    year
  );
}

// Nth Saturday of a month (e.g. Record Store Day = 3rd Saturday of April)
function calculateThirdSaturdayOfMonth(year: number, month: number): string {
  const first = new Date(year, month - 1, 1);
  const daysToFirstSat = (6 - first.getDay() + 7) % 7;
  const date = new Date(year, month - 1, 1 + daysToFirstSat + 14);
  return hasPassed(date)
    ? calculateThirdSaturdayOfMonth(year + 1, month)
    : toISO(date);
}

// Mother's Day (2nd Sunday of May)
function calculateMothersDayDate(year: number): string {
  const may1 = new Date(year, 4, 1);
  const daysToAdd = (7 - may1.getDay()) % 7;
  return nextOrRecurse(
    new Date(year, 4, 1 + daysToAdd + 7),
    calculateMothersDayDate,
    year
  );
}

// Father's Day (3rd Sunday of June)
function calculateFathersDayDate(year: number): string {
  const jun1 = new Date(year, 5, 1);
  const daysToAdd = (7 - jun1.getDay()) % 7;
  return nextOrRecurse(
    new Date(year, 5, 1 + daysToAdd + 14),
    calculateFathersDayDate,
    year
  );
}

// ── Equinox / Solstice (Meeus algorithm, accurate 1951-2050) ──────────

function meeusDate(jde: number): Date {
  return new Date((jde - 2440587.5) * 86400000);
}

function calculateSpringEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde = 2451623.80984 + 365242.37404 * y + 0.05169 * y * y - 0.00411 * y ** 3 - 0.00057 * y ** 4;
  return nextOrRecurse(meeusDate(jde), calculateSpringEquinox, year);
}

function calculateAutumnEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde = 2451810.21715 + 365242.01767 * y - 0.11575 * y * y + 0.00337 * y ** 3 + 0.00078 * y ** 4;
  return nextOrRecurse(meeusDate(jde), calculateAutumnEquinox, year);
}

function calculateSummerSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde = 2451716.56767 + 365241.62603 * y + 0.00325 * y * y + 0.00888 * y ** 3 - 0.0003 * y ** 4;
  return nextOrRecurse(meeusDate(jde), calculateSummerSolstice, year);
}

function calculateWinterSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde = 2451900.05952 + 365242.74049 * y - 0.06223 * y * y - 0.00823 * y ** 3 + 0.00032 * y ** 4;
  return nextOrRecurse(meeusDate(jde), calculateWinterSolstice, year);
}

// ── Lunar-calendar holidays (lookup tables + approximation fallback) ──

function lookupOrApproximate(
  year: number,
  table: Record<number, string>,
  fallbackMonth: number,
  fallbackDay: number,
  recalculate: (y: number) => string
): string {
  if (table[year]) {
    const date = new Date(table[year]);
    if (!hasPassed(date)) return table[year];
    return table[year + 1] ?? recalculate(year + 1);
  }
  const baseDate = new Date(year, fallbackMonth, fallbackDay);
  const daysOffset = (year - 2024) * 11;
  const approx = new Date(baseDate.getTime() + daysOffset * 86400000);
  return hasPassed(approx) ? recalculate(year + 1) : toISO(approx);
}

function calculateDiwaliDate(year: number): string {
  return lookupOrApproximate(year, {
    2024: "2024-11-01", 2025: "2025-10-20", 2026: "2026-11-08",
    2027: "2027-10-28", 2028: "2028-10-17", 2029: "2029-11-05", 2030: "2030-10-26",
  }, 9, 15, calculateDiwaliDate);
}

function calculateHoliDate(year: number): string {
  return lookupOrApproximate(year, {
    2024: "2024-03-25", 2025: "2025-03-14", 2026: "2026-03-03",
    2027: "2027-03-22", 2028: "2028-03-11", 2029: "2029-03-01", 2030: "2030-03-20",
  }, 2, 15, calculateHoliDate);
}

function calculateHanukkahDate(year: number): string {
  return lookupOrApproximate(year, {
    2024: "2024-12-25", 2025: "2025-12-14", 2026: "2026-12-04",
    2027: "2027-12-24", 2028: "2028-12-12", 2029: "2029-12-01", 2030: "2030-12-20",
  }, 11, 10, calculateHanukkahDate);
}
