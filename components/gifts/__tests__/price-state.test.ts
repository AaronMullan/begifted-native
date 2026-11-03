import { PRICE_FRESH_MS, priceState } from "../price-state";

const NOW = Date.parse("2026-11-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe("priceState", () => {
  it("hides a price no page read ever confirmed", () => {
    expect(priceState({ price: 169 }, NOW)).toBe("hidden");
    expect(priceState({ price: 169, price_checked_at: iso(-DAY) }, NOW)).toBe(
      "hidden"
    );
  });

  it("shows a recently confirmed price", () => {
    const at = iso(-DAY);
    expect(
      priceState(
        { price: 179, price_verified_at: at, price_checked_at: at },
        NOW
      )
    ).toBe("verified");
  });

  it("marks a confirmed price a later check couldn't read", () => {
    expect(
      priceState(
        {
          price: 179,
          price_verified_at: iso(-5 * DAY),
          price_checked_at: iso(-DAY),
        },
        NOW
      )
    ).toBe("may_have_changed");
  });

  it("hides a confirmed price once it is past the freshness window", () => {
    const at = iso(-PRICE_FRESH_MS - 1);
    expect(
      priceState(
        { price: 179, price_verified_at: at, price_checked_at: at },
        NOW
      )
    ).toBe("hidden");
  });

  it("hides a missing or zero price even when stamped", () => {
    const at = iso(-DAY);
    expect(priceState({ price_verified_at: at }, NOW)).toBe("hidden");
    expect(priceState({ price: 0, price_verified_at: at }, NOW)).toBe("hidden");
  });
});
