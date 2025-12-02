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
  };

  // Check fixed holidays first
  if (fixedHolidays[normalized]) {
    const { month, day } = fixedHolidays[normalized];
    const date = new Date(targetYear, month - 1, day);
    // If date has passed this year and no year specified, use next year
    if (!year && date < currentDate) {
      return new Date(targetYear + 1, month - 1, day)
        .toISOString()
        .split("T")[0];
    }
    return date.toISOString().split("T")[0];
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
    case "rosh_hashanah":
    case "rosh_hashana":
      return calculateRoshHashanahDate(targetYear);
    case "yom_kippur":
      return calculateYomKippurDate(targetYear);
    case "passover":
    case "pesach":
      return calculatePassoverDate(targetYear);
    case "sukkot":
    case "sukkos":
      return calculateSukkotDate(targetYear);
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

// Internal helper: Calculate Rosh Hashanah date (Jewish New Year)
// Rosh Hashanah falls on 1st of Tishrei (typically September/October)
// Using lookup table for common years, with calculation for others
function calculateRoshHashanahDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const roshHashanahDates: Record<number, string> = {
    2024: "2024-10-02",
    2025: "2025-09-22",
    2026: "2026-10-11",
    2027: "2027-10-01",
    2028: "2028-09-20",
    2029: "2029-10-09",
    2030: "2030-09-28",
  };

  if (roshHashanahDates[year]) {
    const date = new Date(roshHashanahDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      if (roshHashanahDates[year + 1]) {
        return roshHashanahDates[year + 1];
      }
      return calculateRoshHashanahDate(year + 1);
    }
    return roshHashanahDates[year];
  }

  // For years outside lookup table, use approximation formula
  // Rosh Hashanah typically falls in late September to early October
  const baseDate = new Date(year, 8, 25); // September 25
  const daysOffset = (year - 2024) * 11; // Lunar calendar shifts ~11 days per year
  const roshHashanah = new Date(baseDate.getTime() + daysOffset * 86400000);
  const currentDate = new Date();
  if (roshHashanah < currentDate) {
    return calculateRoshHashanahDate(year + 1);
  }
  return roshHashanah.toISOString().split("T")[0];
}

// Internal helper: Calculate Yom Kippur date (Day of Atonement)
// Yom Kippur is 10 days after Rosh Hashanah (typically September/October)
// Using lookup table for common years, with calculation for others
function calculateYomKippurDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const yomKippurDates: Record<number, string> = {
    2024: "2024-10-11",
    2025: "2025-10-01",
    2026: "2026-10-20",
    2027: "2027-10-10",
    2028: "2028-09-29",
    2029: "2029-10-18",
    2030: "2030-10-07",
  };

  if (yomKippurDates[year]) {
    const date = new Date(yomKippurDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      if (yomKippurDates[year + 1]) {
        return yomKippurDates[year + 1];
      }
      return calculateYomKippurDate(year + 1);
    }
    return yomKippurDates[year];
  }

  // For years outside lookup table, calculate as 10 days after Rosh Hashanah
  const roshHashanah = new Date(calculateRoshHashanahDate(year));
  const yomKippur = new Date(roshHashanah.getTime() + 10 * 86400000);
  const currentDate = new Date();
  if (yomKippur < currentDate) {
    return calculateYomKippurDate(year + 1);
  }
  return yomKippur.toISOString().split("T")[0];
}

// Internal helper: Calculate Passover date (Pesach)
// Passover starts on 15th of Nisan (typically March/April)
// Using lookup table for common years, with calculation for others
function calculatePassoverDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const passoverDates: Record<number, string> = {
    2024: "2024-04-22",
    2025: "2025-04-12",
    2026: "2026-04-01",
    2027: "2027-04-21",
    2028: "2028-04-10",
    2029: "2029-03-30",
    2030: "2030-04-17",
  };

  if (passoverDates[year]) {
    const date = new Date(passoverDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      if (passoverDates[year + 1]) {
        return passoverDates[year + 1];
      }
      return calculatePassoverDate(year + 1);
    }
    return passoverDates[year];
  }

  // For years outside lookup table, use approximation formula
  // Passover typically falls in late March to late April
  const baseDate = new Date(year, 3, 5); // April 5
  const daysOffset = (year - 2024) * 11; // Lunar calendar shifts ~11 days per year
  const passover = new Date(baseDate.getTime() + daysOffset * 86400000);
  const currentDate = new Date();
  if (passover < currentDate) {
    return calculatePassoverDate(year + 1);
  }
  return passover.toISOString().split("T")[0];
}

// Internal helper: Calculate Sukkot date
// Sukkot starts on 15th of Tishrei (typically September/October)
// Using lookup table for common years, with calculation for others
function calculateSukkotDate(year: number): string {
  // Lookup table for common years (2024-2030)
  const sukkotDates: Record<number, string> = {
    2024: "2024-10-16",
    2025: "2025-10-06",
    2026: "2026-10-25",
    2027: "2027-10-15",
    2028: "2028-10-04",
    2029: "2029-10-23",
    2030: "2030-10-12",
  };

  if (sukkotDates[year]) {
    const date = new Date(sukkotDates[year]);
    const currentDate = new Date();
    if (date < currentDate) {
      if (sukkotDates[year + 1]) {
        return sukkotDates[year + 1];
      }
      return calculateSukkotDate(year + 1);
    }
    return sukkotDates[year];
  }

  // For years outside lookup table, calculate as 14 days after Rosh Hashanah
  const roshHashanah = new Date(calculateRoshHashanahDate(year));
  const sukkot = new Date(roshHashanah.getTime() + 14 * 86400000);
  const currentDate = new Date();
  if (sukkot < currentDate) {
    return calculateSukkotDate(year + 1);
  }
  return sukkot.toISOString().split("T")[0];
}
