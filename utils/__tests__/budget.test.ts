import { formatBudget } from "../budget";

describe("formatBudget", () => {
  it("shows a range", () => {
    expect(formatBudget(30, 80, false)).toBe("$30–$80");
  });

  it("shows a maximum alone", () => {
    expect(formatBudget(null, 80, false)).toBe("Up to $80");
  });

  it("shows no set limit", () => {
    expect(formatBudget(null, null, true)).toBe("No set limit");
  });

  it("keeps a minimum stated with no limit", () => {
    expect(formatBudget(30, null, true)).toBe("From $30 · No set limit");
  });

  it("lets a stored maximum outrank the no-limit flag", () => {
    expect(formatBudget(30, 80, true)).toBe("$30–$80");
  });

  it("shows a minimum alone", () => {
    expect(formatBudget(30, null, false)).toBe("From $30");
  });

  it("returns null when nothing is set", () => {
    expect(formatBudget(null, undefined, false)).toBeNull();
  });
});
