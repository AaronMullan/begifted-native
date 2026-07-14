import {
  parseISODateLocal,
  formatOccasionDate,
  getNextOccurrence,
  getNextAnnualOccurrence,
  lookupOccasionDate,
  sanitizeExtractedOccasionDate,
} from "../occasion-dates";

// Everything "next occurrence"-shaped is relative to today, so pin the clock.
// July 8, 2026: Valentine's/Easter/Mother's/Father's Day have passed this
// year; Halloween/Thanksgiving/Christmas have not.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 8));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("parseISODateLocal", () => {
  it("parses YYYY-MM-DD as a local calendar date", () => {
    const d = parseISODateLocal("2026-07-04");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(4);
  });

  it("returns null for partial or malformed input", () => {
    expect(parseISODateLocal("2026-07")).toBeNull();
    expect(parseISODateLocal("not-a-date")).toBeNull();
    expect(parseISODateLocal("")).toBeNull();
  });
});

describe("formatOccasionDate", () => {
  it("formats a YYYY-MM-DD string with the long month by default", () => {
    expect(formatOccasionDate("2026-07-04")).toBe("July 4");
  });

  it("supports short month names", () => {
    expect(formatOccasionDate("2026-07-04", { month: "short" })).toBe("Jul 4");
  });

  it("accepts an already-parsed Date", () => {
    expect(formatOccasionDate(new Date(2026, 11, 25))).toBe("December 25");
  });

  it("returns malformed strings as-is instead of 'Invalid Date'", () => {
    expect(formatOccasionDate("soon")).toBe("soon");
  });
});

describe("getNextOccurrence", () => {
  it("returns a future date unchanged", () => {
    expect(getNextOccurrence("2026-12-25")).toBe("2026-12-25");
  });

  it("treats today as not passed", () => {
    expect(getNextOccurrence("2026-07-08")).toBe("2026-07-08");
  });

  it("rolls a passed date to the same month/day next year", () => {
    expect(getNextOccurrence("2026-01-01")).toBe("2027-01-01");
    expect(getNextOccurrence("1985-03-17")).toBe("2027-03-17");
  });

  it("handles the vCard --MM-DD year-unknown form", () => {
    expect(getNextOccurrence("--02-14")).toBe("2027-02-14");
    expect(getNextOccurrence("--12-25")).toBe("2026-12-25");
  });

  it("passes non-ISO strings through untouched", () => {
    expect(getNextOccurrence("July 4")).toBe("July 4");
    expect(getNextOccurrence("")).toBe("");
  });
});

describe("getNextAnnualOccurrence", () => {
  it("pulls a spurious far-future year back to the next occurrence", () => {
    expect(getNextAnnualOccurrence("2027-08-18")).toBe("2026-08-18");
  });

  it("rolls a passed month/day to next year regardless of input year", () => {
    expect(getNextAnnualOccurrence("2026-01-01")).toBe("2027-01-01");
    expect(getNextAnnualOccurrence("1985-03-17")).toBe("2027-03-17");
  });

  it("treats today as not passed", () => {
    expect(getNextAnnualOccurrence("1990-07-08")).toBe("2026-07-08");
  });

  it("handles the vCard --MM-DD year-unknown form", () => {
    expect(getNextAnnualOccurrence("--02-14")).toBe("2027-02-14");
    expect(getNextAnnualOccurrence("--12-25")).toBe("2026-12-25");
  });

  it("passes non-ISO strings through untouched", () => {
    expect(getNextAnnualOccurrence("July 4")).toBe("July 4");
    expect(getNextAnnualOccurrence("")).toBe("");
  });
});

describe("lookupOccasionDate", () => {
  it("returns the upcoming occurrence of a fixed holiday", () => {
    expect(lookupOccasionDate("christmas")).toBe("2026-12-25");
    expect(lookupOccasionDate("halloween")).toBe("2026-10-31");
  });

  it("rolls a passed fixed holiday to next year", () => {
    expect(lookupOccasionDate("Valentine's Day")).toBe("2027-02-14");
  });

  it("honors an explicit year even in the past", () => {
    expect(lookupOccasionDate("christmas", 2030)).toBe("2030-12-25");
  });

  it("computes Thanksgiving as the 4th Thursday of November", () => {
    expect(lookupOccasionDate("thanksgiving")).toBe("2026-11-26");
  });

  it("computes Easter, rolling forward once this year's has passed", () => {
    // Easter 2026 (April 5) has passed on the pinned date -> Easter 2027.
    expect(lookupOccasionDate("easter")).toBe("2027-03-28");
  });

  it("computes Mother's Day (2nd Sunday of May) and Father's Day (3rd Sunday of June)", () => {
    expect(lookupOccasionDate("Mother's Day")).toBe("2027-05-09");
    expect(lookupOccasionDate("Father's Day")).toBe("2027-06-20");
  });

  it("uses the lookup table for lunar-calendar holidays", () => {
    expect(lookupOccasionDate("diwali")).toBe("2026-11-08");
    expect(lookupOccasionDate("hanukkah")).toBe("2026-12-04");
  });

  it("returns null for unknown or user-specific occasions", () => {
    expect(lookupOccasionDate("birthday")).toBeNull();
    expect(lookupOccasionDate("our first date")).toBeNull();
  });
});

describe("sanitizeExtractedOccasionDate", () => {
  it("resolves known types through the lookup regardless of the supplied date", () => {
    expect(sanitizeExtractedOccasionDate("valentines_day", "2026-01-01")).toBe(
      "2027-02-14"
    );
    expect(sanitizeExtractedOccasionDate("halloween", null)).toBe("2026-10-31");
  });

  it("keeps New Year's on Jan 1 via the lookup", () => {
    expect(sanitizeExtractedOccasionDate("new_years_day", "2026-01-01")).toBe(
      "2027-01-01"
    );
  });

  it("rejects Jan-1 placeholder dates for unknown types", () => {
    expect(
      sanitizeExtractedOccasionDate("end_of_tour", "2027-01-01")
    ).toBeNull();
    expect(
      sanitizeExtractedOccasionDate("bastille_day", "2026-01-01")
    ).toBeNull();
  });

  it("rolls a real date for an unknown type to its next occurrence", () => {
    expect(sanitizeExtractedOccasionDate("anniversary", "2001-09-22")).toBe(
      "2026-09-22"
    );
    expect(sanitizeExtractedOccasionDate("graduation", "2027-05-15")).toBe(
      "2027-05-15"
    );
  });

  it("returns null for missing or malformed dates on unknown types", () => {
    expect(sanitizeExtractedOccasionDate("end_of_tour", null)).toBeNull();
    expect(sanitizeExtractedOccasionDate("end_of_tour", "null")).toBeNull();
    expect(
      sanitizeExtractedOccasionDate("end_of_tour", "next spring")
    ).toBeNull();
    expect(sanitizeExtractedOccasionDate("end_of_tour", "")).toBeNull();
  });
});
