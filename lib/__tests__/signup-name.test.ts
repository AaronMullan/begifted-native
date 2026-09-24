import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import { flushPendingSignUpName, markPendingSignUpName } from "../signup-name";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);

const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
jest.mock("../supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      upsert: (...args: unknown[]) => {
        mockUpsert(...args);
        return {
          select: () => ({ single: async () => ({ error: null }) }),
        };
      },
    }),
  },
}));

const user = { id: "user-1", email: "maya@example.com" } as User;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockMaybeSingle.mockReset();
  mockUpsert.mockReset();
});

test("fills a NULL name for the account it was typed for", async () => {
  await markPendingSignUpName("Maya@Example.com", "Maya");
  mockMaybeSingle.mockResolvedValue({ data: { full_name: null }, error: null });

  expect(await flushPendingSignUpName(user)).toBe(true);
  expect(mockUpsert).toHaveBeenCalledWith(
    { id: "user-1", full_name: "Maya" },
    { onConflict: "id" }
  );
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test("never overwrites an existing name", async () => {
  await markPendingSignUpName("maya@example.com", "Someone Else");
  mockMaybeSingle.mockResolvedValue({
    data: { full_name: "Maya" },
    error: null,
  });

  expect(await flushPendingSignUpName(user)).toBe(false);
  expect(mockUpsert).not.toHaveBeenCalled();
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test("leaves a marker for a different account untouched", async () => {
  await markPendingSignUpName("other@example.com", "Other");

  await flushPendingSignUpName(user);

  expect(mockMaybeSingle).not.toHaveBeenCalled();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
});

test("keeps the marker when the read fails, for a retry", async () => {
  await markPendingSignUpName("maya@example.com", "Maya");
  mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });

  await flushPendingSignUpName(user);

  expect(mockUpsert).not.toHaveBeenCalled();
  expect(await AsyncStorage.getAllKeys()).toHaveLength(1);
});
