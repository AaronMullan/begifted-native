import { recommendedMomentsFor } from "../recommended-moments";

describe("recommendedMomentsFor", () => {
  it("offers Christmas when no cultural context is stored", () => {
    expect(recommendedMomentsFor("friend", [])).toEqual([
      "Birthday",
      "Christmas",
    ]);
  });

  it("swaps the December chip for the holiday the user named", () => {
    expect(
      recommendedMomentsFor("friend", [], [], "observes Hanukkah")
    ).toEqual(["Birthday", "Hanukkah"]);
    expect(
      recommendedMomentsFor("friend", [], [], "celebrates Diwali")
    ).toEqual(["Birthday", "Diwali"]);
    expect(
      recommendedMomentsFor("friend", [], [], "celebrates Kwanzaa")
    ).toEqual(["Birthday", "Kwanzaa"]);
  });

  it("offers no December chip for a tradition that does not keep Christmas", () => {
    // Offering Christmas here would be worse than offering nothing, and
    // guessing a date for an unresolvable holiday worse still.
    expect(
      recommendedMomentsFor("friend", [], [], "practicing Muslim")
    ).toEqual(["Birthday"]);
    expect(
      recommendedMomentsFor("friend", [], [], "Jewish family, not observant")
    ).toEqual(["Birthday"]);
  });

  it("suppresses on plural and -ism spellings, not just the bare stem", () => {
    // These all fell through to Christmas while only the singular matched,
    // which is the outcome the suppression list exists to prevent.
    for (const phrase of [
      "Orthodox Jew",
      "the family are Muslims",
      "practices Hinduism",
      "practices Buddhism",
      "Sikhs",
      "Buddhists",
    ]) {
      expect(recommendedMomentsFor("friend", [], [], phrase)).toEqual([
        "Birthday",
      ]);
    }
  });

  it("does not suppress on words that merely contain a tradition stem", () => {
    for (const phrase of ["grew up in Islamabad", "collects jewelry"]) {
      expect(recommendedMomentsFor("friend", [], [], phrase)).toEqual([
        "Birthday",
        "Christmas",
      ]);
    }
  });

  it("keeps Christmas for a stated context that names no holiday but still keeps it", () => {
    // Both are the extractor's own documented examples. Neither says
    // "Christmas", and suppressing on every unmatched phrase stripped the
    // chip from people for whom it was exactly right.
    expect(
      recommendedMomentsFor("friend", [], [], "practicing Catholic")
    ).toEqual(["Birthday", "Christmas"]);
    expect(
      recommendedMomentsFor(
        "friend",
        [],
        [],
        "Italian-American family traditions"
      )
    ).toEqual(["Birthday", "Christmas"]);
  });

  it("still drops a holiday the recipient already tracks", () => {
    expect(
      recommendedMomentsFor("friend", ["hanukkah"], [], "observes Hanukkah")
    ).toEqual(["Birthday"]);
  });

  it("keeps relationship-gated chips alongside the cultural swap", () => {
    expect(recommendedMomentsFor("wife", [], [], "observes Hanukkah")).toEqual([
      "Birthday",
      "Anniversary",
      "Valentine's Day",
      "Hanukkah",
    ]);
  });
});
