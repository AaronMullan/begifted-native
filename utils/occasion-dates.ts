/** Match YYYY-MM-DD so we only treat explicit ISO dates as valid. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  if (date >= today) {
    return isoDateStr;
  }
  const nextYear = today.getFullYear() + 1;
  const next = new Date(nextYear, m - 1, d);
  return next.toISOString().split("T")[0];
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
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
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
    kwanzaa: { month: 12, day: 26 }, // Kwanzaa starts December 26 (fixed date)
    kwanza: { month: 12, day: 26 },
    makar_sankranti: { month: 1, day: 14 }, // Hindu fixed date
    vaisakhi: { month: 4, day: 14 }, // Sikh/Hindu fixed date
    baisakhi: { month: 4, day: 14 },
    national_bbq_day: { month: 5, day: 16 },
    national_country_music_day: { month: 9, day: 17 }, // observed in US
  };

  // Check fixed holidays first
  if (fixedHolidays[normalized]) {
    const { month, day } = fixedHolidays[normalized];
    let targetYearToUse = targetYear;

    // Always check if date has passed - if so, use next year (unless year was explicitly provided)
    // Normalize dates to midnight for accurate comparison
    const dateForThisYear = new Date(currentYear, month - 1, day);
    const todayNormalized = new Date(
      currentYear,
      currentDate.getMonth(),
      currentDate.getDate()
    );

    if (!year && dateForThisYear < todayNormalized) {
      targetYearToUse = currentYear + 1;
    }

    const finalDate = new Date(targetYearToUse, month - 1, day);
    return finalDate.toISOString().split("T")[0];
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
      return calculateThirdSaturdayOfMonth(targetYear, 4); // April
    default:
      // User-specific occasions (anniversary, custom events) return null
      // These require user input
      return null;
  }
}

// Internal helper: Calculate Easter date (first Sunday after first full moon after spring equinox)
// Uses simplified algorithm (works for years 1900-2099)
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

  const date = new Date(year, month - 1, day);
  const currentDate = new Date();
  // If date has passed this year and no year specified, calculate for next year
  if (date < currentDate) {
    return calculateEasterDate(year + 1);
  }
  return date.toISOString().split("T")[0];
}

// Internal helper: Calculate Thanksgiving (4th Thursday of November)
function calculateThanksgivingDate(year: number): string {
  // November 1st
  const nov1 = new Date(year, 10, 1);
  // Get day of week (0 = Sunday, 4 = Thursday)
  const dayOfWeek = nov1.getDay();
  // Calculate days to add to get to first Thursday
  const daysToAdd = dayOfWeek <= 4 ? 4 - dayOfWeek : 11 - dayOfWeek;
  // Add 3 weeks (21 days) to get to 4th Thursday
  const thanksgiving = new Date(year, 10, 1 + daysToAdd + 21);

  const currentDate = new Date();
  if (thanksgiving < currentDate) {
    return calculateThanksgivingDate(year + 1);
  }
  return thanksgiving.toISOString().split("T")[0];
}

// Internal helper: Calculate Nth Saturday of month (e.g. Record Store Day = 3rd Saturday of April)
function calculateThirdSaturdayOfMonth(year: number, month: number): string {
  const first = new Date(year, month - 1, 1);
  const dayOfWeek = first.getDay(); // 0 Sun .. 6 Sat
  const daysToFirstSat = (6 - dayOfWeek + 7) % 7;
  const thirdSaturday = new Date(year, month - 1, 1 + daysToFirstSat + 14);
  const currentDate = new Date();
  if (thirdSaturday < currentDate) {
    return calculateThirdSaturdayOfMonth(year + 1, month);
  }
  return thirdSaturday.toISOString().split("T")[0];
}

// Internal helper: Calculate Mother's Day (2nd Sunday of May)
function calculateMothersDayDate(year: number): string {
  // May 1st
  const may1 = new Date(year, 4, 1);
  const dayOfWeek = may1.getDay();
  // Calculate days to add to get to first Sunday
  const daysToAdd = (7 - dayOfWeek) % 7;
  // Add 1 week (7 days) to get to 2nd Sunday
  const mothersDay = new Date(year, 4, 1 + daysToAdd + 7);

  const currentDate = new Date();
  if (mothersDay < currentDate) {
    return calculateMothersDayDate(year + 1);
  }
  return mothersDay.toISOString().split("T")[0];
}

// Internal helper: Calculate Father's Day (3rd Sunday of June)
function calculateFathersDayDate(year: number): string {
  // June 1st
  const jun1 = new Date(year, 5, 1);
  const dayOfWeek = jun1.getDay();
  // Calculate days to add to get to first Sunday
  const daysToAdd = (7 - dayOfWeek) % 7;
  // Add 2 weeks (14 days) to get to 3rd Sunday
  const fathersDay = new Date(year, 5, 1 + daysToAdd + 14);

  const currentDate = new Date();
  if (fathersDay < currentDate) {
    return calculateFathersDayDate(year + 1);
  }
  return fathersDay.toISOString().split("T")[0];
}

// Internal helper: Calculate Spring Equinox (March equinox)
// Uses simplified Meeus algorithm (accurate for 1951-2050)
function calculateSpringEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451623.80984 +
    365242.37404 * y +
    0.05169 * y * y -
    0.00411 * y * y * y -
    0.00057 * y * y * y * y;
  const date = new Date((jde - 2440587.5) * 86400000);
  const currentDate = new Date();
  if (date < currentDate) {
    return calculateSpringEquinox(year + 1);
  }
  return date.toISOString().split("T")[0];
}

// Internal helper: Calculate Autumn Equinox (September equinox)
// Uses simplified Meeus algorithm (accurate for 1951-2050)
function calculateAutumnEquinox(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451810.21715 +
    365242.01767 * y -
    0.11575 * y * y +
    0.00337 * y * y * y +
    0.00078 * y * y * y * y;
  const date = new Date((jde - 2440587.5) * 86400000);
  const currentDate = new Date();
  if (date < currentDate) {
    return calculateAutumnEquinox(year + 1);
  }
  return date.toISOString().split("T")[0];
}

// Internal helper: Calculate Summer Solstice (June solstice)
// Uses simplified Meeus algorithm (accurate for 1951-2050)
function calculateSummerSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451716.56767 +
    365241.62603 * y +
    0.00325 * y * y +
    0.00888 * y * y * y -
    0.0003 * y * y * y * y;
  const date = new Date((jde - 2440587.5) * 86400000);
  const currentDate = new Date();
  if (date < currentDate) {
    return calculateSummerSolstice(year + 1);
  }
  return date.toISOString().split("T")[0];
}

// Internal helper: Calculate Winter Solstice (December solstice)
// Uses simplified Meeus algorithm (accurate for 1951-2050)
function calculateWinterSolstice(year: number): string {
  const y = (year - 2000) / 1000;
  const jde =
    2451900.05952 +
    365242.74049 * y -
    0.06223 * y * y -
    0.00823 * y * y * y +
    0.00032 * y * y * y * y;
  const date = new Date((jde - 2440587.5) * 86400000);
  const currentDate = new Date();
  if (date < currentDate) {
    return calculateWinterSolstice(year + 1);
  }
  return date.toISOString().split("T")[0];
}

// Internal helper: Calculate Diwali date (Hindu lunar calendar)
// Diwali falls on the new moon day of Kartika month (typically October/November)
// Using lookup table for common years, with calculation for others
function calculateDiwaliDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const diwaliDates: Record<number, string> = {
    2024: "2024-11-01",
    2025: "2025-10-20",
    2026: "2026-11-08",
    2027: "2027-10-28",
    2028: "2028-10-17",
    2029: "2029-11-05",
    2030: "2030-10-26",
  };

  if (diwaliDates[year]) {
    const date = new Date(diwaliDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      // If date has passed, get next year's date
      if (diwaliDates[year + 1]) {
        return diwaliDates[year + 1];
      }
      return calculateDiwaliDate(year + 1);
    }
    return diwaliDates[year];
  }

  // For years outside lookup table, use approximation formula
  // Diwali is approximately 15 days before the new moon in late October/early November
  // This is a simplified approximation
  const baseDate = new Date(year, 9, 15); // October 15
  const daysOffset = (year - 2024) * 11; // Lunar calendar shifts ~11 days per year
  const diwali = new Date(baseDate.getTime() + daysOffset * 86400000);
  const currentDate = new Date();
  if (diwali < currentDate) {
    return calculateDiwaliDate(year + 1);
  }
  return diwali.toISOString().split("T")[0];
}

// Internal helper: Calculate Holi date (Hindu lunar calendar)
// Holi falls on the full moon day of Phalguna month (typically March)
// Using lookup table for common years, with calculation for others
function calculateHoliDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const holiDates: Record<number, string> = {
    2024: "2024-03-25",
    2025: "2025-03-14",
    2026: "2026-03-03",
    2027: "2027-03-22",
    2028: "2028-03-11",
    2029: "2029-03-01",
    2030: "2030-03-20",
  };

  if (holiDates[year]) {
    const date = new Date(holiDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      // If date has passed, get next year's date
      if (holiDates[year + 1]) {
        return holiDates[year + 1];
      }
      return calculateHoliDate(year + 1);
    }
    return holiDates[year];
  }

  // For years outside lookup table, use approximation formula
  const baseDate = new Date(year, 2, 15); // March 15
  const daysOffset = (year - 2024) * 11; // Lunar calendar shifts ~11 days per year
  const holi = new Date(baseDate.getTime() + daysOffset * 86400000);
  const currentDate = new Date();
  if (holi < currentDate) {
    return calculateHoliDate(year + 1);
  }
  return holi.toISOString().split("T")[0];
}

// Internal helper: Calculate Hanukkah date (Jewish lunar calendar)
// Hanukkah starts on 25th of Kislev (typically November/December)
// Using lookup table for common years, with calculation for others
function calculateHanukkahDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const hanukkahDates: Record<number, string> = {
    2024: "2024-12-25",
    2025: "2025-12-14",
    2026: "2026-12-04",
    2027: "2027-12-24",
    2028: "2028-12-12",
    2029: "2029-12-01",
    2030: "2030-12-20",
  };

  if (hanukkahDates[year]) {
    const date = new Date(hanukkahDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      // If date has passed, get next year's date
      if (hanukkahDates[year + 1]) {
        return hanukkahDates[year + 1];
      }
      return calculateHanukkahDate(year + 1);
    }
    return hanukkahDates[year];
  }

  // For years outside lookup table, use approximation formula
  // Hanukkah typically falls in late November to late December
  const baseDate = new Date(year, 11, 10); // December 10
  const daysOffset = (year - 2024) * 11; // Lunar calendar shifts ~11 days per year
  const hanukkah = new Date(baseDate.getTime() + daysOffset * 86400000);
  const currentDate = new Date();
  if (hanukkah < currentDate) {
    return calculateHanukkahDate(year + 1);
  }
  return hanukkah.toISOString().split("T")[0];
}
