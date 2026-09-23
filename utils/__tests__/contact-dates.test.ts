import { contactAnniversary, vCardAnniversary } from "../contact-dates";

describe("contactAnniversary", () => {
  it("converts expo-contacts' 0-indexed January", () => {
    expect(
      contactAnniversary([{ label: "anniversary", month: 0, day: 15 }])
    ).toEqual({ month: 1, day: 15, year: undefined });
  });

  it("converts expo-contacts' 0-indexed December, keeping the year", () => {
    expect(
      contactAnniversary([
        { label: "Anniversary", month: 11, day: 31, year: 2004 },
      ])
    ).toEqual({ month: 12, day: 31, year: 2004 });
  });

  it("ignores unrecognized and custom labels", () => {
    expect(
      contactAnniversary([
        { label: "other", month: 5, day: 1 },
        { label: "first date", month: 2, day: 9 },
      ])
    ).toBeUndefined();
    expect(contactAnniversary(undefined)).toBeUndefined();
    expect(contactAnniversary([])).toBeUndefined();
  });

  it("picks the anniversary among other dates", () => {
    expect(
      contactAnniversary([
        { label: "other", month: 5, day: 1 },
        { label: "anniversary", month: 6, day: 4 },
      ])
    ).toEqual({ month: 7, day: 4, year: undefined });
  });

  it("ignores a non-Gregorian date", () => {
    expect(
      contactAnniversary([
        { label: "anniversary", month: 0, day: 15, format: "hebrew" },
      ])
    ).toBeUndefined();
    expect(
      contactAnniversary([
        { label: "anniversary", month: 0, day: 15, format: "gregorian" },
      ])
    ).toEqual({ month: 1, day: 15, year: undefined });
  });

  it("drops an impossible date", () => {
    expect(
      contactAnniversary([{ label: "anniversary", month: 1, day: 30 }])
    ).toBeUndefined();
  });
});

describe("vCardAnniversary", () => {
  it("reads a vCard 4 ANNIVERSARY", () => {
    expect(vCardAnniversary("FN:A\r\nANNIVERSARY:20040115\r\n")).toEqual({
      month: 1,
      day: 15,
      year: 2004,
    });
  });

  it("reads a yearless X-ANNIVERSARY", () => {
    expect(vCardAnniversary("FN:A\r\nX-ANNIVERSARY:--12-31\r\n")).toEqual({
      month: 12,
      day: 31,
      year: undefined,
    });
  });

  it("reads Apple's grouped X-ABDATE anniversary", () => {
    const card = [
      "FN:A",
      "item1.X-ABDATE;type=pref:2010-01-01",
      "item1.X-ABLabel:_$!<Other>!$_",
      "item2.X-ABDATE:2004-12-05",
      "item2.X-ABLabel:_$!<Anniversary>!$_",
      "",
    ].join("\r\n");
    expect(vCardAnniversary(card)).toEqual({ month: 12, day: 5, year: 2004 });
  });

  it("returns nothing for a card without an anniversary", () => {
    expect(vCardAnniversary("FN:A\r\nBDAY:1980-01-02\r\n")).toBeUndefined();
  });
});
