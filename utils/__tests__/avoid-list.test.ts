import { describeAvoidAdditions, mergeAvoidList } from "../avoid-list";

describe("mergeAvoidList", () => {
  it("appends owned and avoid entries with their prefixes", () => {
    const result = mergeAvoidList(
      ["Porta Pro® Wireless"],
      ["a Kindle"],
      ["food gifts"]
    );
    expect(result.avoidList).toEqual([
      "Porta Pro® Wireless",
      "Already owns: a Kindle",
      "Avoid: food gifts",
    ]);
    expect(result.addedOwned).toEqual(["a Kindle"]);
    expect(result.addedAvoid).toEqual(["food gifts"]);
  });

  it("returns null when the note mentions neither", () => {
    expect(mergeAvoidList(["Silicone Freezer Trays"], [], undefined)).toEqual({
      avoidList: null,
      addedOwned: [],
      addedAvoid: [],
    });
  });

  it("never removes an existing entry", () => {
    const result = mergeAvoidList(
      ["Avoid: candles", "Already owns: AirPods"],
      [],
      ["food"]
    );
    expect(result.avoidList).toEqual([
      "Avoid: candles",
      "Already owns: AirPods",
      "Avoid: food",
    ]);
  });

  it("dedupes case-insensitively against stored and repeated entries", () => {
    const result = mergeAvoidList(
      ["Already owns: a Kindle"],
      ["A kindle", "AirPods", "airpods"],
      []
    );
    expect(result.avoidList).toEqual([
      "Already owns: a Kindle",
      "Already owns: AirPods",
    ]);
    expect(result.addedOwned).toEqual(["AirPods"]);
  });

  it("keeps a title that starts with No", () => {
    expect(mergeAvoidList(null, [], ["No Man's Sky"]).addedAvoid).toEqual([
      "No Man's Sky",
    ]);
  });

  it("strips a repeated verb and ignores non-strings and blanks", () => {
    const result = mergeAvoidList(
      null,
      ["already has a Kindle", 3, " ", "none"],
      ["no food gifts", "Avoid candles"]
    );
    expect(result.avoidList).toEqual([
      "Already owns: a Kindle",
      "Avoid: food gifts",
      "Avoid: candles",
    ]);
  });
});

describe("describeAvoidAdditions", () => {
  it("names owned items and avoids", () => {
    expect(
      describeAvoidAdditions(
        "Michelle",
        ["a Kindle", "AirPods"],
        ["food gifts"]
      )
    ).toBe(
      "Michelle already has a Kindle and AirPods. No food gifts for Michelle."
    );
  });

  it("returns an empty string when nothing was added", () => {
    expect(describeAvoidAdditions("Michelle", [], [])).toBe("");
  });
});
