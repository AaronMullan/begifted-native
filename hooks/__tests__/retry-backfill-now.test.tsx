import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRetryBackfillNow } from "../use-submit-gift-feedback";
import { triggerGiftBackfill } from "../../lib/api";
import { queryKeys } from "../../lib/query-keys";

jest.mock("../../lib/api", () => ({
  backfillScopeKey: (recipientId: string, occasionId?: string | null) =>
    occasionId ? `${recipientId}:${occasionId}` : recipientId,
  triggerGiftBackfill: jest.fn(async () => false),
  BACKFILL_MAX_MS: 6 * 60 * 1000,
  GIFT_REMOVAL_ACTIONS: [],
}));
jest.mock("../use-auth", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("../../lib/edge-retry", () => ({ invokeWithRetry: jest.fn() }));

const render = async (occasionId: string) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.giftSuggestions("r1"), {
    suggestions: [],
    scopes: { [`r1:${occasionId}`]: { peak: 3, stalled: true } },
  });
  const hook = await renderHook(() => useRetryBackfillNow("r1", occasionId), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return { queryClient, hook };
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("a tap asks again and puts the card back to finding", async () => {
  const { queryClient, hook } = await render("o1");
  await act(async () => hook.result.current.retry());

  expect(triggerGiftBackfill).toHaveBeenCalledWith("r1", "o1");
  expect(
    queryClient.getQueryData<{ scopes: Record<string, { stalled: boolean }> }>(
      queryKeys.giftSuggestions("r1")
    )?.scopes["r1:o1"].stalled
  ).toBe(false);
  expect(hook.result.current.coolingDown).toBe(true);
});

test("repeat taps inside the cooldown start no second generation", async () => {
  (triggerGiftBackfill as jest.Mock).mockClear();
  const { hook } = await render("o2");
  await act(async () => hook.result.current.retry());
  await act(async () => hook.result.current.retry());
  await act(async () => hook.result.current.retry());
  expect(triggerGiftBackfill).toHaveBeenCalledTimes(1);
  expect(hook.result.current.coolingDown).toBe(true);

  await act(async () => jest.advanceTimersByTime(30 * 1000));
  expect(hook.result.current.coolingDown).toBe(false);
});
