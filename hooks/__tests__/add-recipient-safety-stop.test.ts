import { act, renderHook } from "@testing-library/react-native";
import { useAddRecipientFlow } from "../use-add-recipient-flow";
import {
  clearAddRecipientDraft,
  peekAddRecipientDraft,
} from "../../lib/add-recipient-draft";
import type { AddRecipientDraft } from "../../lib/add-recipient-draft";
import { invokeWithRetry } from "../../lib/edge-retry";
import { supabase } from "../../lib/supabase";

jest.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: "t" } },
      })),
    },
    functions: { invoke: jest.fn() },
    from: jest.fn(),
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);
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

function renderFlow(resume: AddRecipientDraft | null = null) {
  return renderHook(() =>
    useAddRecipientFlow(
      "user-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { resume, persist: true }
    )
  );
}

// Moderation screens only the latest message, so after a refusal the next
// ordinary description passes the gate. The session itself has to end.
describe("Add Person safety stop", () => {
  // Message ids come from Date.now(); keep them distinct across tests so a
  // refused id from one test can't match a message in the next.
  let clock = 1_700_000_000_000;
  beforeEach(() => {
    invoke.mockReset();
    clearAddRecipientDraft();
    jest.spyOn(Date, "now").mockImplementation(() => (clock += 10));
  });

  it("carries a self-harm kind through so the screen can hold the crisis message", async () => {
    const crisis = {
      ...SAFETY_DECLINED,
      safety_kind: "self_harm_other",
      message: "I’m concerned about their safety.",
      reply: "I’m concerned about their safety.",
    };
    invoke.mockResolvedValueOnce({ data: crisis, error: null });
    const { result } = await renderFlow();

    await act(async () => {
      await result.current.sendMessage(
        "I want to give my brother something he can use to end his own life."
      );
    });

    expect(result.current.safetyStopMessage).toBe(crisis.message);
    expect(result.current.safetyStopKind).toBe("self_harm_other");
    expect(peekAddRecipientDraft("user-1")).toBeNull();
  });

  it("treats a refusal without a kind as the plain decline", async () => {
    invoke.mockResolvedValueOnce({ data: SAFETY_DECLINED, error: null });
    const { result } = await renderFlow();

    await act(async () => {
      await result.current.sendMessage("Find my ex's new address.");
    });

    expect(result.current.safetyStopKind).toBe("generic");
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

  it("stops a resumed copy of the session when the refusal lands after leaving", async () => {
    let resolveRefusal: (value: unknown) => void = () => {};
    invoke.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRefusal = resolve))
    );
    const first = await renderFlow();
    let pendingSend: Promise<void> = Promise.resolve();
    await act(async () => {
      pendingSend = first.result.current.sendMessage("something harmful");
    });
    await first.unmount();

    const parked = peekAddRecipientDraft("user-1");
    expect(parked).not.toBeNull();
    const { result } = await renderFlow(parked);

    await act(async () => {
      resolveRefusal({ data: SAFETY_DECLINED, error: null });
      await pendingSend;
    });
    expect(peekAddRecipientDraft("user-1")).toBeNull();

    invoke.mockResolvedValue({
      data: {
        reply: "Tell me more.",
        extractedData: { name: "Sam", relationship_type: "sibling" },
      },
      error: null,
    });
    let finish: string | undefined;
    await act(async () => {
      await result.current.sendMessage("He loves cycling.");
      finish = await result.current.handleFinishConversation();
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(finish).toBe("safety_declined");
    expect(result.current.showDataReview).toBe(false);
    expect(result.current.safetyStopMessage).not.toBeNull();
  });

  it("shows a resumed copy the same crisis message the original got", async () => {
    let resolveRefusal: (value: unknown) => void = () => {};
    invoke.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRefusal = resolve))
    );
    const first = await renderFlow();
    let pendingSend: Promise<void> = Promise.resolve();
    await act(async () => {
      pendingSend = first.result.current.sendMessage(
        "I don't want to be here anymore."
      );
    });
    await first.unmount();

    const { result } = await renderFlow(peekAddRecipientDraft("user-1"));
    const crisis = {
      ...SAFETY_DECLINED,
      safety_kind: "self_harm",
      message: "I’m sorry you’re going through this.",
    };
    await act(async () => {
      resolveRefusal({ data: crisis, error: null });
      await pendingSend;
    });

    await act(async () => {
      await result.current.sendMessage("Never mind, it's for my sister.");
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(result.current.safetyStopKind).toBe("self_harm");
    expect(result.current.safetyStopMessage).toBe(crisis.message);
  });

  it("blocks the save when the refusal lands after a resumed copy reached review", async () => {
    let resolveRefusal: (value: unknown) => void = () => {};
    invoke.mockImplementationOnce(
      () => new Promise((resolve) => (resolveRefusal = resolve))
    );
    const first = await renderFlow();
    let pendingSend: Promise<void> = Promise.resolve();
    await act(async () => {
      pendingSend = first.result.current.sendMessage("something harmful");
    });
    await first.unmount();
    const { result } = await renderFlow(peekAddRecipientDraft("user-1"));

    invoke.mockResolvedValue({
      data: {
        reply: "Tell me more.",
        extractedData: { name: "Sam", relationship_type: "sibling" },
      },
      error: null,
    });
    await act(async () => {
      await result.current.sendMessage("He loves cycling.");
    });
    await act(async () => {
      await result.current.handleFinishConversation();
    });
    expect(result.current.showDataReview).toBe(true);

    await act(async () => {
      resolveRefusal({ data: SAFETY_DECLINED, error: null });
      await pendingSend;
    });
    await act(async () => {
      await result.current.handleOccasionsSkip();
    });

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.saveSuccess).toBe(false);
    expect(result.current.safetyStopMessage).not.toBeNull();
  });
});
