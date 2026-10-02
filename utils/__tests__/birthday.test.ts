import {
  parseBirthdayParts,
  normalizeBirthday,
  isInvalidBirthdayInput,
  formatBirthdayDisplay,
  birthdayHasYear,
  backfillBirthdayFromAge,
  birthYearFromAge,
  birthYearFromYearOnly,
  birthdayFromOccasionDate,
  birthdayAfterOccasionEdit,
  birthdayPlanningAnchor,
  approximateBirthdayLabel,
  approximateTimingPhrase,
  birthdayRangeContains,
  parseBirthdayRange,
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
  it("stores nothing when no month/day is known — never a synthetic Jan 1", () => {
    expect(backfillBirthdayFromAge(47, null)).toBeNull();
  });

  it("age-only intake lands on birth_year instead (via birthYearFromAge)", () => {
    expect(birthYearFromAge(47)).toBe(1979);
    expect(birthYearFromAge(47.4)).toBe(1979);
    expect(birthYearFromAge(0)).toBeNull();
    expect(birthYearFromAge(-3)).toBeNull();
    expect(birthYearFromAge(200)).toBeNull();
    expect(birthYearFromAge(null)).toBeNull();
    expect(birthYearFromAge(Number.NaN)).toBeNull();
  });

  it("backfills the year onto a known month/day", () => {
    expect(backfillBirthdayFromAge(47, "--06-05")).toBe("1979-06-05");
  });

  it("subtracts a year when this year's birthday is still ahead", () => {
    // Clock is 2026-07-08: someone who is 47 with a September birthday turned
    // 47 last September, so they were born in 1978, not 1979.
    expect(backfillBirthdayFromAge(47, "--09-11")).toBe("1978-09-11");
    // A birthday today has already happened this year.
    expect(backfillBirthdayFromAge(47, "--07-08")).toBe("1979-07-08");
  });

  it("never overwrites a birthday whose year is already known", () => {
    expect(backfillBirthdayFromAge(47, "1980-06-05")).toBeNull();
  });

  it("rounds fractional ages", () => {
    expect(backfillBirthdayFromAge(47.4, "--06-05")).toBe("1979-06-05");
  });

  it("rejects implausible or missing ages", () => {
    expect(backfillBirthdayFromAge(0, null)).toBeNull();
    expect(backfillBirthdayFromAge(-3, null)).toBeNull();
    expect(backfillBirthdayFromAge(200, null)).toBeNull();
    expect(backfillBirthdayFromAge(null, null)).toBeNull();
    expect(backfillBirthdayFromAge(Number.NaN, null)).toBeNull();
  });
});

describe("birthYearFromYearOnly", () => {
  it("accepts a plausible bare year", () => {
    expect(birthYearFromYearOnly("1961")).toBe(1961);
    expect(birthYearFromYearOnly(" 2019 ")).toBe(2019);
  });

  it("rejects anything that is not a bare plausible year", () => {
    expect(birthYearFromYearOnly("1961-09-11")).toBeNull();
    expect(birthYearFromYearOnly("--09-11")).toBeNull();
    expect(birthYearFromYearOnly("0000")).toBeNull();
    expect(birthYearFromYearOnly("2031")).toBeNull();
    expect(birthYearFromYearOnly(null)).toBeNull();
  });
});

describe("birthdayFromOccasionDate", () => {
  it("keeps a past year as the birth year", () => {
    expect(birthdayFromOccasionDate("1953-07-28")).toBe("1953-07-28");
  });

  it("drops a current or future year — it is only the next occurrence", () => {
    expect(birthdayFromOccasionDate("2026-09-11")).toBe("--09-11");
    expect(birthdayFromOccasionDate("2027-07-28")).toBe("--07-28");
  });

  it("returns null for anything unparseable", () => {
    expect(birthdayFromOccasionDate(null)).toBeNull();
    expect(birthdayFromOccasionDate("soon")).toBeNull();
  });
});

describe("birthdayAfterOccasionEdit", () => {
  it("moves a year-unknown birthday to the moment's new day", () => {
    expect(birthdayAfterOccasionEdit("2027-08-07", "--08-08")).toBe("--08-07");
  });

  it("keeps a known birth year when the moment carries only the next occurrence", () => {
    expect(birthdayAfterOccasionEdit("2026-08-07", "1980-08-08")).toBe(
      "1980-08-07"
    );
  });

  it("takes a past year entered on the moment as the birth year", () => {
    expect(birthdayAfterOccasionEdit("1975-08-07", "--08-08")).toBe(
      "1975-08-07"
    );
  });

  it("sets a birthday when none was stored", () => {
    expect(birthdayAfterOccasionEdit("2026-09-11", null)).toBe("--09-11");
  });

  it("returns null when the birthday already agrees", () => {
    expect(birthdayAfterOccasionEdit("2027-08-08", "--08-08")).toBeNull();
    expect(birthdayAfterOccasionEdit("2026-08-08", "1980-08-08")).toBeNull();
  });

  it("drops the year rather than store an impossible Feb 29", () => {
    expect(birthdayAfterOccasionEdit("2028-02-29", "1981-03-01")).toBe(
      "--02-29"
    );
  });

  it("returns null for an unparseable date", () => {
    expect(birthdayAfterOccasionEdit("", "--08-08")).toBeNull();
  });
});

describe("approximate birthday ranges", () => {
  it("canonicalizes the extracted and stored forms", () => {
    expect(normalizeBirthday("03-08/03-14")).toBe("--03-08/--03-14");
    expect(normalizeBirthday("--03-08/--03-14")).toBe("--03-08/--03-14");
    expect(normalizeBirthday("12-28/01-03")).toBe("--12-28/--01-03");
  });

  it("round-trips through its display form", () => {
    for (const stored of [
      "--03-08/--03-14",
      "--03-28/--04-03",
      "--12-01/--12-31",
      "--02-01/--02-29",
    ]) {
      expect(normalizeBirthday(formatBirthdayDisplay(stored))).toBe(stored);
    }
    expect(formatBirthdayDisplay("--03-08/--03-14")).toBe("March 8–14");
    expect(formatBirthdayDisplay("--03-28/--04-03")).toBe("March 28 – April 3");
    expect(formatBirthdayDisplay("--12-01/--12-31")).toBe("December");
    expect(formatBirthdayDisplay("--02-01/--02-28")).toBe("February");
  });

  it("accepts a range typed with a plain hyphen", () => {
    expect(normalizeBirthday("March 8-14")).toBe("--03-08/--03-14");
    expect(isInvalidBirthdayInput("March 8-14")).toBe(false);
  });

  it("rejects ranges that are unreal or too wide to plan around", () => {
    expect(parseBirthdayRange("03-08/03-08")).toBeNull();
    expect(parseBirthdayRange("03-01/06-30")).toBeNull();
    expect(parseBirthdayRange("02-25/02-31")).toBeNull();
    expect(parseBirthdayRange("03-second_week")).toBeNull();
    expect(normalizeBirthday("03-second_week")).toBeNull();
  });

  it("is not an exact birthday", () => {
    expect(parseBirthdayParts("--03-08/--03-14")).toBeNull();
    expect(birthdayHasYear("--03-08/--03-14")).toBe(false);
    expect(backfillBirthdayFromAge(60, "--03-08/--03-14")).toBeNull();
  });

  it("anchors planning on the first day", () => {
    expect(birthdayPlanningAnchor("--03-08/--03-14")).toBe("--03-08");
    expect(birthdayPlanningAnchor("1985-03-17")).toBe("--03-17");
    expect(birthdayPlanningAnchor("1961")).toBeNull();
  });

  it("knows whether an exact day falls inside a range", () => {
    expect(birthdayRangeContains("--06-01/--06-30", "1990-06-12")).toBe(true);
    expect(birthdayRangeContains("--07-01/--07-10", "--06-12")).toBe(false);
    expect(birthdayRangeContains("--12-28/--01-03", "--01-02")).toBe(true);
    expect(birthdayRangeContains("--06-12", "--06-12")).toBe(false);
  });

  it("makes the birthday exact when the anchor day is typed", () => {
    expect(
      birthdayAfterOccasionEdit("2027-03-08", "--03-08/--03-14", true)
    ).toBe("--03-08");
  });

  it("keeps the range when its moment is saved on the anchor date", () => {
    expect(
      birthdayAfterOccasionEdit("2027-03-08", "--03-08/--03-14")
    ).toBeNull();
  });

  it("takes an exact day the user gives the moment", () => {
    expect(birthdayAfterOccasionEdit("2027-03-11", "--03-08/--03-14")).toBe(
      "--03-11"
    );
  });
});

describe("approximateBirthdayLabel", () => {
  it("gives the range for a birthday moment of an approximate birthday", () => {
    expect(approximateBirthdayLabel("birthday", "--03-08/--03-14")).toBe(
      "March 8–14"
    );
    expect(approximateBirthdayLabel("birthday", "--12-01/--12-31")).toBe(
      "December"
    );
  });

  it("is null for an exact birthday, no birthday, or another moment", () => {
    expect(approximateBirthdayLabel("birthday", "1990-03-08")).toBeNull();
    expect(approximateBirthdayLabel("birthday", "--03-08")).toBeNull();
    expect(approximateBirthdayLabel("birthday", null)).toBeNull();
    expect(
      approximateBirthdayLabel("anniversary", "--03-08/--03-14")
    ).toBeNull();
  });
});

describe("approximateTimingPhrase", () => {
  it("never reads as a countdown", () => {
    expect(approximateTimingPhrase("March 8–14")).toBe("Around March 8–14");
    expect(approximateTimingPhrase("December")).toBe("Sometime in December");
  });
});
