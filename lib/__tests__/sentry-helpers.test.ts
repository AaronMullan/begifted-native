import { isExpectedTransientError, isOfflineError } from "../sentry-helpers";

// The Sentry SDK pulls untransformed ESM into Jest; the helpers under test
// never reach it, so a stub keeps the suite hermetic.
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

describe("isOfflineError", () => {
  it("matches the React Native XHR offline shapes", () => {
    expect(isOfflineError(new Error("Network request failed"))).toBe(true);
    expect(isOfflineError(new Error("TypeError: Network request failed"))).toBe(
      true
    );
    expect(isOfflineError(new Error("Network request timed out"))).toBe(true);
  });

  it("matches Expo fetch's native transport failure wrapper", () => {
    expect(
      isOfflineError(
        new Error(
          "fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)"
        )
      )
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isOfflineError(new Error("Cannot read property 'id'"))).toBe(false);
    expect(isOfflineError(new Error("fetch returned 500"))).toBe(false);
  });
});

describe("isExpectedTransientError", () => {
  it("suppresses a PostgrestError coerced from an Expo fetch failure", () => {
    // postgrest-js formats a rejected fetch as `${name}: ${message}`; Expo's
    // FetchError keeps the default "Error" name.
    const postgrestError = {
      message:
        "Error: fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)",
      details: "",
      hint: "",
      code: "",
    };
    expect(isExpectedTransientError(postgrestError)).toBe(true);
  });

  it("still reports a genuine server error", () => {
    expect(
      isExpectedTransientError({
        message: "duplicate key value violates unique constraint",
        details: "",
        hint: "",
        code: "23505",
      })
    ).toBe(false);
  });
});
