import { recommendedMomentsFor } from "../recommended-moments";
import { lookupOccasionDate } from "../occasion-dates";
import { slugifyOccasionName } from "../occasion-slug";

const promoted = (context: string | null) =>
  recommendedMomentsFor("friend", [], [], context).filter(
    (chip) => chip !== "Birthday"
  );

describe("recommendedMomentsFor", () => {
  it("promotes no holiday when nothing was stated", () => {
    // Christmas and Hanukkah are in the common row for everyone, so the
    // recommended row stays quiet until there is a reason to single one out.
    expect(recommendedMomentsFor("friend", [])).toEqual(["Birthday"]);
  });

  it("promotes the holiday the user named", () => {
    expect(promoted("observes Hanukkah")).toEqual(["Hanukkah"]);
    expect(promoted("celebrates Diwali")).toEqual(["Diwali"]);
    expect(promoted("celebrates Kwanzaa")).toEqual(["Kwanzaa"]);
    expect(promoted("big Christmas family")).toEqual(["Christmas"]);
    expect(promoted("celebrates Eid")).toEqual(["Eid al-Fitr"]);
    expect(promoted("Chinese New Year")).toEqual(["Lunar New Year"]);
    expect(promoted("we host the seder")).toEqual(["Passover"]);
  });

  it("maps a stated tradition to its principal gifting day", () => {
    expect(promoted("practicing Muslim")).toEqual(["Eid al-Fitr"]);
    expect(promoted("the family are Muslims")).toEqual(["Eid al-Fitr"]);
    expect(promoted("Orthodox Jew")).toEqual(["Hanukkah"]);
    expect(promoted("Hindu family")).toEqual(["Diwali"]);
  });

  it("lets a named holiday beat a named tradition", () => {
    // Someone who says which holiday they keep has answered the question.
    expect(promoted("Jewish, we do Passover")).toEqual(["Passover"]);
  });

  it("ignores words that merely contain a tradition's name", () => {
    for (const phrase of [
      "grew up in Islamabad",
      "from Hindustan",
      "collects jewelry",
      "Heidi's side of the family",
    ]) {
      expect(promoted(phrase)).toEqual([]);
    }
  });

  it("promotes nothing for a phrase naming no holiday we hold a date for", () => {
    // Guessing is the failure mode. Christmas and Hanukkah stay one tap away
    // in the common row regardless.
    expect(promoted("practicing Catholic")).toEqual([]);
    expect(promoted("Italian-American family traditions")).toEqual([]);
  });

  it("resolves a date for every holiday it can promote", () => {
    // A promoted chip that resolves nothing costs the user an MM-DD entry for
    // a date they would have to go and look up.
    for (const label of [
      "Christmas",
      "Hanukkah",
      "Passover",
      "Diwali",
      "Kwanzaa",
      "Eid al-Fitr",
      "Lunar New Year",
    ]) {
      expect(lookupOccasionDate(slugifyOccasionName(label))).not.toBeNull();
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
