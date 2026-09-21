// recommended-moments imports slugifyOccasionName from a hook module that
// pulls in Sentry's ESM build, which jest cannot transform.
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

  it("offers no December chip when the stated context names no holiday we can date", () => {
    // Offering Christmas here would be worse than offering nothing, and
    // guessing a date for an unresolvable holiday worse still.
    expect(
      recommendedMomentsFor("friend", [], [], "practicing Muslim")
    ).toEqual(["Birthday"]);
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
