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
