import { reconcileInterests } from "../interests";

describe("reconcileInterests", () => {
  it("appends added interests and dedups case-insensitively", () => {
    expect(reconcileInterests(["Skiing"], ["skiing", "cooking"], [])).toEqual([
      "Skiing",
      "cooking",
    ]);
  });

  it("removes an exact match regardless of case", () => {
    expect(reconcileInterests(["Hiking", "cooking"], [], ["hiking"])).toEqual([
      "cooking",
    ]);
  });

  it("removes a stored interest containing the removed word (DEV-368)", () => {
    expect(
      reconcileInterests(
        ["fly fishing occasionally", "whiskey"],
        [],
        ["fishing"]
      )
    ).toEqual(["whiskey"]);
  });

  it("matches shared stems like fish/fishing", () => {
    expect(
      reconcileInterests(
        ["fly fishing occasionally", "gifts related to fish", "cooking"],
        [],
        ["fish"]
      )
    ).toEqual(["cooking"]);
  });

  it("does not remove on short-word stem collisions", () => {
    expect(reconcileInterests(["martial arts"], [], ["art"])).toEqual([
      "martial arts",
    ]);
  });

  it("requires every word of the removal to match", () => {
    expect(
      reconcileInterests(
        ["thoughtful unexpected gifts", "gifts related to fish"],
        [],
        ["gifts related to fish"]
      )
    ).toEqual(["thoughtful unexpected gifts"]);
  });

  it("filters a freshly-added interest that matches a removal", () => {
    expect(
      reconcileInterests(["whiskey"], ["gifts related to fish"], ["fish"])
    ).toEqual(["whiskey"]);
  });

  it("leaves the list untouched with no removals", () => {
    expect(reconcileInterests(["a", "b"], [], [])).toEqual(["a", "b"]);
  });
});
