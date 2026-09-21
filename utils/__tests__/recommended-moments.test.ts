import { recommendedMomentsFor } from "../recommended-moments";

describe("recommendedMomentsFor", () => {
  it("promotes no holiday when nothing was stated", () => {
    // Christmas and Hanukkah are in the common row for everyone, so the
    // recommended row stays quiet until there is a reason to single one out.
    expect(recommendedMomentsFor("friend", [])).toEqual(["Birthday"]);
  });

  it("promotes the holiday the user actually named", () => {
    expect(
      recommendedMomentsFor("friend", [], [], "observes Hanukkah")
    ).toEqual(["Birthday", "Hanukkah"]);
    expect(
      recommendedMomentsFor("friend", [], [], "celebrates Diwali")
    ).toEqual(["Birthday", "Diwali"]);
    expect(
      recommendedMomentsFor("friend", [], [], "celebrates Kwanzaa")
    ).toEqual(["Birthday", "Kwanzaa"]);
    expect(
      recommendedMomentsFor("friend", [], [], "big Christmas family")
    ).toEqual(["Birthday", "Christmas"]);
  });

  it("promotes nothing for a phrase that names no holiday we hold a date for", () => {
    // Guessing is the failure mode here. Whatever the phrase says, Christmas
    // and Hanukkah remain one tap away in the common row.
    for (const phrase of [
      "practicing Muslim",
      "practicing Catholic",
      "Italian-American family traditions",
      "Orthodox Jew",
    ]) {
      expect(recommendedMomentsFor("friend", [], [], phrase)).toEqual([
        "Birthday",
      ]);
    }
  });

  it("still drops a holiday the recipient already tracks", () => {
    expect(
      recommendedMomentsFor("friend", ["hanukkah"], [], "observes Hanukkah")
    ).toEqual(["Birthday"]);
  });

  it("keeps relationship-gated chips alongside the promoted holiday", () => {
    expect(recommendedMomentsFor("wife", [], [], "observes Hanukkah")).toEqual([
      "Birthday",
      "Anniversary",
      "Valentine's Day",
      "Hanukkah",
    ]);
  });
});
