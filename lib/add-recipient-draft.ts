import type { ExtractedData, Message } from "../hooks/use-conversation-flow";
import type { PendingContactSeed } from "./pending-contact-queue";

export type AddRecipientDraftSeed = PendingContactSeed & {
  /** A free-form note (Moments "Tell BeGifted about them" drawer) sent as the
   * first conversation message so extraction runs on it immediately. */
  note?: string;
};

export type AddRecipientDraft = {
  userId: string;
  seed: AddRecipientDraftSeed;
  messages: Message[];
  conversationContext: string | null;
  shouldShowNextStepButton: boolean;
  extractedData: ExtractedData | null;
  showDataReview: boolean;
  showOccasionsSelection: boolean;
  savedAt: number;
};

// Held in module memory, mirroring pending-contact-queue: nothing is written
// to the DB until the flow saves, so an evaporated draft (app restart) can
// never leave a half-created recipient behind.
let draft: AddRecipientDraft | null = null;

// A draft parked longer than this reads as absent — resurfacing a days-old
// half-conversation in a long-lived session would confuse more than it helps.
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveAddRecipientDraft(
  next: Omit<AddRecipientDraft, "savedAt">,
  now: number = Date.now()
): void {
  draft = { ...next, savedAt: now };
}

/** Read without clearing — safe to call from a React state initializer,
 * which must stay pure (StrictMode/concurrent React can replay it).
 * Expired drafts and drafts belonging to another account read as absent. */
export function peekAddRecipientDraft(
  userId: string,
  now: number = Date.now()
): AddRecipientDraft | null {
  if (!draft) return null;
  if (draft.userId !== userId) return null;
  if (now - draft.savedAt > DRAFT_MAX_AGE_MS) return null;
  return draft;
}

export function clearAddRecipientDraft(): void {
  draft = null;
}
