import {
  parseBirthdayParts,
  normalizeBirthday,
  isInvalidBirthdayInput,
  formatBirthdayDisplay,
  birthdayHasYear,
  backfillBirthdayFromAge,
} from "../birthday";

// Year validation ("no future years") and age backfill both key off the
// current year, so pin the clock.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 6, 8));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("parseBirthdayParts", () => {
  it("parses the canonical full-date form", () => {
    expect(parseBirthdayParts("1985-03-17")).toEqual({
      year: 1985,
      month: 3,
      day: 17,
    });
  });

  it("parses the vCard year-unknown form", () => {
    expect(parseBirthdayParts("--12-05")).toEqual({
      year: null,
      month: 12,
      day: 5,
    });
  });

  it("parses loose M-D input as year-unknown", () => {
    expect(parseBirthdayParts("3-17")).toEqual({
      year: null,
      month: 3,
      day: 17,
    });
  });

  it("parses customary month-name forms, with and without year", () => {
    expect(parseBirthdayParts("March 17, 1985")).toEqual({
      year: 1985,
      month: 3,
      day: 17,
    });
    expect(parseBirthdayParts("Mar 17")).toEqual({
      year: null,
      month: 3,
      day: 17,
    });
  });

  it("repairs the LLM's year-0000 tell to year-unknown", () => {
    expect(parseBirthdayParts("0000-02-29")).toEqual({
      year: null,
      month: 2,
      day: 29,
    });
  });

  it("rejects impossible dates and implausible years", () => {
    expect(parseBirthdayParts("1985-02-30")).toBeNull();
    expect(parseBirthdayParts("2027-01-01")).toBeNull(); // future year
    expect(parseBirthdayParts("1700-01-01")).toBeNull(); // before MIN_YEAR
    expect(parseBirthdayParts("1985-13-01")).toBeNull();
  });

  it("returns null for empty or unparseable input", () => {
    expect(parseBirthdayParts(null)).toBeNull();
    expect(parseBirthdayParts("")).toBeNull();
    expect(parseBirthdayParts("   ")).toBeNull();
    expect(parseBirthdayParts("sometime in spring")).toBeNull();
  });
});

describe("normalizeBirthday", () => {
  it("normalizes friendly input to canonical storage forms", () => {
    expect(normalizeBirthday("March 17, 1985")).toBe("1985-03-17");
    expect(normalizeBirthday("Mar 17")).toBe("--03-17");
    expect(normalizeBirthday("3-5")).toBe("--03-05");
    expect(normalizeBirthday("0000-06-05")).toBe("--06-05");
  });

  it("returns null for garbage so nothing bad reaches storage", () => {
    expect(normalizeBirthday("garbage")).toBeNull();
    expect(normalizeBirthday(undefined)).toBeNull();
  });

  it("accepts US-customary month-day-year entry", () => {
    expect(normalizeBirthday("12-07-1990")).toBe("1990-12-07");
    expect(normalizeBirthday("8/18/1978")).toBe("1978-08-18");
    expect(normalizeBirthday("3-5-2001")).toBe("2001-03-05");
    expect(normalizeBirthday("12/7")).toBe("--12-07");
  });

  it("still accepts canonical ISO input", () => {
    expect(normalizeBirthday("1990-12-07")).toBe("1990-12-07");
  });
});

describe("isInvalidBirthdayInput", () => {
  it("is false for empty input (nothing typed is not an error)", () => {
    expect(isInvalidBirthdayInput("")).toBe(false);
    expect(isInvalidBirthdayInput(null)).toBe(false);
    expect(isInvalidBirthdayInput("  ")).toBe(false);
  });

  it("is true only for non-empty unparseable input", () => {
    expect(isInvalidBirthdayInput("garbage")).toBe(true);
    expect(isInvalidBirthdayInput("1985-03-17")).toBe(false);
    expect(isInvalidBirthdayInput("Mar 17")).toBe(false);
  });
});

describe("formatBirthdayDisplay", () => {
  it("includes the year when known", () => {
    expect(formatBirthdayDisplay("1985-03-17")).toBe("March 17, 1985");
  });

  it("can suppress the year on request", () => {
    expect(
      formatBirthdayDisplay("1985-03-17", { includeYearWhenKnown: false })
    ).toBe("March 17");
  });

  it("omits the year when unknown", () => {
    expect(formatBirthdayDisplay("--03-17")).toBe("March 17");
  });

  it("returns empty string for unparseable input", () => {
    expect(formatBirthdayDisplay(null)).toBe("");
    expect(formatBirthdayDisplay("garbage")).toBe("");
  });
});

describe("birthdayHasYear", () => {
  it("distinguishes full dates from month/day-only", () => {
    expect(birthdayHasYear("1985-03-17")).toBe(true);
    expect(birthdayHasYear("--03-17")).toBe(false);
    expect(birthdayHasYear(null)).toBe(false);
  });
});

describe("backfillBirthdayFromAge", () => {
  it("stores a synthetic Jan 1 date when nothing is known", () => {
    expect(backfillBirthdayFromAge(47, null)).toBe("1979-01-01");
  });

  it("backfills the year onto a known month/day", () => {
    expect(backfillBirthdayFromAge(47, "--06-05")).toBe("1979-06-05");
  });

  it("never overwrites a birthday whose year is already known", () => {
    expect(backfillBirthdayFromAge(47, "1980-06-05")).toBeNull();
  });

  it("rounds fractional ages", () => {
    expect(backfillBirthdayFromAge(47.4, null)).toBe("1979-01-01");
  });

  it("rejects implausible or missing ages", () => {
    expect(backfillBirthdayFromAge(0, null)).toBeNull();
    expect(backfillBirthdayFromAge(-3, null)).toBeNull();
    expect(backfillBirthdayFromAge(200, null)).toBeNull();
    expect(backfillBirthdayFromAge(null, null)).toBeNull();
    expect(backfillBirthdayFromAge(Number.NaN, null)).toBeNull();
  });
});
