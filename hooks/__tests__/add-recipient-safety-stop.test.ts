import { act, renderHook } from "@testing-library/react-native";
import { useAddRecipientFlow } from "../use-add-recipient-flow";
import {
  clearAddRecipientDraft,
  peekAddRecipientDraft,
} from "../../lib/add-recipient-draft";
import { invokeWithRetry } from "../../lib/edge-retry";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: "t" } },
      })),
    },
    functions: { invoke: jest.fn() },
  },
}));
jest.mock("../../lib/edge-retry", () => ({ invokeWithRetry: jest.fn() }));
jest.mock("../../lib/api", () => ({
  logProductEvent: jest.fn(),
  logProductEvents: jest.fn(),
}));
jest.mock("../../lib/recipient-photo", () => ({
  uploadRecipientPhoto: jest.fn(),
}));
jest.mock("../../components/GlobalSnackbar", () => ({
  showSnackbar: jest.fn(),
}));
jest.mock("../../components/beta/BetaCheckInProvider", () => ({
  useBetaCheckIn: () => ({ triggerCheckIn: jest.fn() }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@sentry/react-native", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const invoke = invokeWithRetry as jest.Mock;

const SAFETY_DECLINED = {
  safety_declined: true,
  message: "This isn't something BeGifted can help with.",
  reply: "This isn't something BeGifted can help with.",
  status: "safety_declined",
  suggestions: [],
};

function renderFlow() {
  return renderHook(() =>
    useAddRecipientFlow(
      "user-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resume: null, persist: true }
    )
  );
}

// Moderation screens only the latest message, so after a refusal the next
// ordinary description passes the gate. The session itself has to end.
describe("Add Person safety stop", () => {
  beforeEach(() => {
    invoke.mockReset();
    clearAddRecipientDraft();
  });

  it("ends the session on a refused chat turn so typing on can't reach review", async () => {
    invoke.mockResolvedValueOnce({ data: SAFETY_DECLINED, error: null });
    const { result } = await renderFlow();

    await act(async () => {
      await result.current.sendMessage(
        "I want to give my brother something he can use to end his own life."
      );
    });

    expect(result.current.safetyStopMessage).toBe(SAFETY_DECLINED.message);
    expect(
      result.current.messages.some(
        (m: { content: string }) => m.content === SAFETY_DECLINED.reply
      )
    ).toBe(false);
    expect(peekAddRecipientDraft("user-1")).toBeNull();

    invoke.mockResolvedValue({
      data: {
        reply: "Tell me more about him.",
        extractedData: { name: "Sam", relationship_type: "sibling" },
      },
      error: null,
    });
    await act(async () => {
      await result.current.sendMessage("He's 34 and loves cycling.");
    });
    let finish: string | undefined;
    await act(async () => {
      finish = await result.current.handleFinishConversation();
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(finish).toBe("safety_declined");
    expect(result.current.showDataReview).toBe(false);
    expect(peekAddRecipientDraft("user-1")).toBeNull();
  });

  it("ends the session on a refusal at the finish step", async () => {
    invoke.mockResolvedValueOnce({
      data: { reply: "Tell me more.", shouldShowNextStepButton: true },
      error: null,
    });
    const { result } = await renderFlow();
    await act(async () => {
      await result.current.sendMessage("My brother Sam.");
    });
    expect(peekAddRecipientDraft("user-1")).not.toBeNull();

    invoke.mockResolvedValueOnce({ data: SAFETY_DECLINED, error: null });
    let finish: string | undefined;
    await act(async () => {
      finish = await result.current.handleFinishConversation();
    });

    expect(finish).toBe("safety_declined");
    expect(result.current.safetyStopMessage).toBe(SAFETY_DECLINED.message);
    expect(result.current.showDataReview).toBe(false);
    expect(peekAddRecipientDraft("user-1")).toBeNull();
  });

  it("lets a new, ordinary Add Person session proceed after a stop", async () => {
    invoke.mockResolvedValueOnce({ data: SAFETY_DECLINED, error: null });
    const first = await renderFlow();
    await act(async () => {
      await first.result.current.sendMessage("something harmful");
    });
    await first.unmount();

    invoke.mockResolvedValueOnce({
      data: { reply: "What does she enjoy?" },
      error: null,
    });
    const { result } = await renderFlow();
    await act(async () => {
      await result.current.sendMessage("My sister Maya.");
    });

    expect(result.current.safetyStopMessage).toBeNull();
    expect(result.current.messages.at(-1)?.content).toBe(
      "What does she enjoy?"
    );
    expect(peekAddRecipientDraft("user-1")).not.toBeNull();
  });
});
