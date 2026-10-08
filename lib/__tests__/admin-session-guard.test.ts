import { fetchTractionMetrics, updateAppConfig } from "../api/admin";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockGetSession = jest.fn();
const mockFrom = jest.fn();
jest.mock("../supabase", () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    from: (table: string) => mockFrom(table),
  },
}));

beforeEach(() => {
  mockGetSession.mockReset();
  mockFrom.mockReset();
});

test("a lapsed session errors instead of reading anonymously", async () => {
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

  await expect(fetchTractionMetrics()).rejects.toThrow(/sign-in has lapsed/);
  await expect(updateAppConfig({}, "admin-1")).rejects.toThrow(
    /sign-in has lapsed/
  );
  expect(mockFrom).not.toHaveBeenCalled();
});
