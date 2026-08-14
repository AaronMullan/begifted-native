import type { ExtractedData } from "../hooks/use-conversation-flow";

export type PendingContactSeed = {
  name?: string;
  birthday?: string;
  photoUri?: string;
  address: Partial<
    Pick<ExtractedData, "address" | "city" | "state" | "zip_code" | "country">
  >;
};

// Held in module memory, not navigation params or storage: nothing is written
// to the DB until each person's setup completes, so losing the queue (app
// restart, abandoned batch) can never leave half-created recipients behind.
let pendingQueue: PendingContactSeed[] | null = null;

export function setPendingContactQueue(queue: PendingContactSeed[]): void {
  pendingQueue = queue;
}

/** Read without clearing — safe to call from a React state initializer,
 * which must stay pure (StrictMode/concurrent React can replay it). */
export function peekPendingContactQueue(): PendingContactSeed[] | null {
  return pendingQueue;
}

/** Clear after mount so a later visit to the add screen can't replay the batch. */
export function clearPendingContactQueue(): void {
  pendingQueue = null;
}
