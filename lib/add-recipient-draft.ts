import type {
  ExtractedData,
  Message,
  SafetyKind,
} from "../hooks/use-conversation-flow";
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

// Write fence. A superseded flow instance can still hold a live write closure
// (its AI request outlives the screen), and without the fence its late write
// could resurrect a cleared draft — resuming a conversation for a recipient
// already saved — or clobber a newer conversation with an older snapshot.
// Writers must present the latest claimed token; claiming or clearing revokes
// every earlier writer.
let writeToken = 0;

// A draft parked longer than this reads as absent — resurfacing a days-old
// half-conversation in a long-lived session would confuse more than it helps.
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function claimAddRecipientDraftWriteToken(): number {
  writeToken += 1;
  return writeToken;
}

export function saveAddRecipientDraft(
  next: Omit<AddRecipientDraft, "savedAt">,
  token: number,
  now: number = Date.now()
): void {
  if (token !== writeToken) return;
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
  writeToken += 1;
}

// User messages the chat refused, with the refusal itself. A refusal can land
// after its screen has unmounted and a reopened Add Person has resumed the
// same conversation from the draft; marking the messages lets that resumed
// copy see it was refused (the server screens only the latest message, so it
// can't tell) and show the same message, crisis resources included.
export type AddRecipientRefusal = { message: string; kind: SafetyKind };

const refusedMessages = new Map<string, AddRecipientRefusal>();

/** Marks the conversation's user messages refused and clears the parked
 * draft if it holds any of them — a newer, unrelated draft is left alone. */
export function markAddRecipientConversationRefused(
  messages: Pick<Message, "id" | "role">[],
  refusal: AddRecipientRefusal
): void {
  for (const m of messages) {
    if (m.role === "user") refusedMessages.set(m.id, refusal);
  }
  if (draft && addRecipientConversationRefusal(draft.messages)) {
    clearAddRecipientDraft();
  }
}

export function addRecipientConversationRefusal(
  messages: Pick<Message, "id" | "role">[]
): AddRecipientRefusal | null {
  for (const m of messages) {
    const refusal = m.role === "user" ? refusedMessages.get(m.id) : undefined;
    if (refusal) return refusal;
  }
  return null;
}
