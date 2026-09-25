import { findExistingRecipient, isLikelySamePerson } from "../recipient-match";

describe("isLikelySamePerson", () => {
  it.each([
    ["Benjamin Craig", "benjamin craig"],
    ["  Benjamin   Craig ", "Benjamin Craig"],
    ["José Núñez", "Jose Nunez"],
    ["Ben Craig", "Benjamin Craig"],
    ["Bob Smith", "Robert Smith"],
    ["Ryan", "Ryan Palmer"],
    ["Ryan P.", "Ryan Palmer"],
    ["Mom", "mom"],
  ])("matches %s ~ %s", (a, b) => {
    expect(isLikelySamePerson(a, b)).toBe(true);
    expect(isLikelySamePerson(b, a)).toBe(true);
  });

  it.each([
    ["Ryan Palmer", "Ryan Jones"],
    ["Ryan Palmer", "Bryan Palmer"],
    ["Sam Craig", "Ben Craig"],
    ["Ryan J.", "Ryan Palmer"],
    ["", "Ryan Palmer"],
  ])("does not match %s ~ %s", (a, b) => {
    expect(isLikelySamePerson(a, b)).toBe(false);
  });
});

describe("findExistingRecipient", () => {
  const recipients = [
    { id: "1", name: "Ben Jones" },
    { id: "2", name: "Benjamin Craig" },
    { id: "3", name: "Ben" },
  ];

  it("prefers an exact name over a looser match", () => {
    expect(findExistingRecipient("ben", recipients)?.id).toBe("3");
    expect(findExistingRecipient("Benjamin Craig", recipients)?.id).toBe("2");
  });

  it("falls back to a nickname or partial match", () => {
    expect(findExistingRecipient("Ben Craig", recipients)?.id).toBe("2");
  });

  it("returns null for no name or no match", () => {
    expect(findExistingRecipient(undefined, recipients)).toBeNull();
    expect(findExistingRecipient("  ", recipients)).toBeNull();
    expect(findExistingRecipient("Ryan Palmer", recipients)).toBeNull();
  });
});
