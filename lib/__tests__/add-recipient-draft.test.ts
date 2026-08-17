import {
  clearAddRecipientDraft,
  peekAddRecipientDraft,
  saveAddRecipientDraft,
} from "../add-recipient-draft";
import type { AddRecipientDraft } from "../add-recipient-draft";

const T0 = 1_700_000_000_000;
const HOUR_MS = 60 * 60 * 1000;

function makeDraft(): Omit<AddRecipientDraft, "savedAt"> {
  return {
    userId: "user-1",
    seed: { address: {} },
    messages: [
      { id: "1", role: "assistant", content: "Hello!" },
      { id: "2", role: "user", content: "I'd like to add my sister Maya." },
    ],
    conversationContext: "gathering",
    shouldShowNextStepButton: false,
    extractedData: null,
    showDataReview: false,
    showOccasionsSelection: false,
  };
}

describe("add-recipient draft store", () => {
  beforeEach(() => {
    clearAddRecipientDraft();
  });

  it("reads back the parked draft for the same user", () => {
    saveAddRecipientDraft(makeDraft(), T0);
    expect(peekAddRecipientDraft("user-1", T0)?.messages).toHaveLength(2);
  });

  it("is empty before any save and after clear", () => {
    expect(peekAddRecipientDraft("user-1", T0)).toBeNull();
    saveAddRecipientDraft(makeDraft(), T0);
    clearAddRecipientDraft();
    expect(peekAddRecipientDraft("user-1", T0)).toBeNull();
  });

  it("never surfaces another account's draft", () => {
    saveAddRecipientDraft(makeDraft(), T0);
    expect(peekAddRecipientDraft("user-2", T0)).toBeNull();
  });

  it("expires after 24 hours but survives up to it", () => {
    saveAddRecipientDraft(makeDraft(), T0);
    expect(peekAddRecipientDraft("user-1", T0 + 23 * HOUR_MS)).not.toBeNull();
    expect(peekAddRecipientDraft("user-1", T0 + 25 * HOUR_MS)).toBeNull();
  });

  it("keeps the latest save when overwritten", () => {
    saveAddRecipientDraft(makeDraft(), T0);
    saveAddRecipientDraft({ ...makeDraft(), userId: "user-2" }, T0);
    expect(peekAddRecipientDraft("user-1", T0)).toBeNull();
    expect(peekAddRecipientDraft("user-2", T0)).not.toBeNull();
  });
});
