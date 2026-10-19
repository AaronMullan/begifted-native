import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { ExtractedData } from "../hooks/use-conversation-flow";
import type { AddRecipientDraft } from "./add-recipient-draft";

export type PendingContactSeed = {
  name?: string;
  birthday?: string;
  /** YYYY-MM-DD, or --MM-DD when the address book has no year. */
  anniversary?: string;
  photoUri?: string;
  address: Partial<
    Pick<ExtractedData, "address" | "city" | "state" | "zip_code" | "country">
  >;
};

/** How far someone's setup got, so finishing them later resumes it. */
export type PendingContactProgress = Omit<
  AddRecipientDraft,
  "userId" | "seed" | "savedAt"
>;

/** A contact picked in "Add X People" whose setup hasn't finished. */
export type PendingContact = {
  id: string;
  seed: PendingContactSeed;
  progress?: PendingContactProgress;
};

// Unfinished people live on the device, never in the recipients table: a
// recipients row is what gift generation, Moments and reminders run on, and
// an unfinished person must get none of them.
const storageKey = (userId: string) => `@begifted/unfinished_people:${userId}`;

// Contact photos are copied here rather than the cache directory, which iOS
// purges — an unfinished person can wait weeks to be finished.
export const UNFINISHED_PHOTO_DIR = `${FileSystem.documentDirectory}unfinished-people/`;

// Every read and write runs through this chain: the add flow writes progress
// after each reply while People may remove the same person, and interleaved
// read-modify-writes would resurrect or drop entries.
let chain: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const next = chain.then(task, task);
  chain = next.catch(() => undefined);
  return next;
}

async function readList(userId: string): Promise<PendingContact[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList(
  userId: string,
  list: PendingContact[]
): Promise<void> {
  try {
    if (list.length === 0) {
      await AsyncStorage.removeItem(storageKey(userId));
    } else {
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(list));
    }
  } catch {
    // Worst case the user picks this person from Contacts again.
  }
}

const sameName = (a?: string, b?: string) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export function readUnfinishedPeople(
  userId: string
): Promise<PendingContact[]> {
  return serialized(() => readList(userId));
}

/** Remembers the picks and returns them in pick order. Someone already
 * waiting under the same name keeps their entry and progress instead of
 * gaining a duplicate. */
export function addUnfinishedPeople(
  userId: string,
  seeds: PendingContactSeed[]
): Promise<PendingContact[]> {
  return serialized(async () => {
    const list = await readList(userId);
    const picked: PendingContact[] = [];
    for (const seed of seeds) {
      const existing = list.find((p) => sameName(p.seed.name, seed.name));
      if (existing) {
        if (!picked.includes(existing)) picked.push(existing);
        continue;
      }
      const entry: PendingContact = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        seed,
      };
      list.push(entry);
      picked.push(entry);
    }
    await writeList(userId, list);
    return picked;
  });
}

// Write fence per person, as in lib/add-recipient-draft: a flow's AI reply
// can land after its screen is gone and a newer flow for the same person has
// moved on, and that late write must not roll the newer progress back.
const writeTokens = new Map<string, number>();
let tokenCounter = 0;

export function claimUnfinishedWriteToken(id: string): number {
  tokenCounter += 1;
  writeTokens.set(id, tokenCounter);
  return tokenCounter;
}

function revokeWriters(id: string): void {
  tokenCounter += 1;
  writeTokens.set(id, tokenCounter);
}

export function saveUnfinishedProgress(
  userId: string,
  id: string,
  progress: PendingContactProgress,
  token: number
): Promise<void> {
  if (writeTokens.get(id) !== token) return Promise.resolve();
  return serialized(async () => {
    if (writeTokens.get(id) !== token) return;
    const list = await readList(userId);
    const entry = list.find((p) => p.id === id);
    // A removed person stays removed; a late write must not bring them back.
    if (!entry) return;
    entry.progress = progress;
    await writeList(userId, list);
  });
}

export function clearUnfinishedProgress(
  userId: string,
  id: string
): Promise<void> {
  revokeWriters(id);
  return serialized(async () => {
    const list = await readList(userId);
    const entry = list.find((p) => p.id === id);
    if (!entry?.progress) return;
    delete entry.progress;
    await writeList(userId, list);
  });
}

export function removeUnfinishedPerson(
  userId: string,
  id: string
): Promise<void> {
  revokeWriters(id);
  return serialized(async () => {
    const list = await readList(userId);
    const entry = list.find((p) => p.id === id);
    if (!entry) return;
    await writeList(
      userId,
      list.filter((p) => p.id !== id)
    );
    const photo = entry.seed.photoUri;
    if (photo?.startsWith(UNFINISHED_PHOTO_DIR)) {
      await FileSystem.deleteAsync(photo, { idempotent: true }).catch(
        () => undefined
      );
    }
  });
}

// The batch handed from the contact picker to the add screen. Held in module
// memory, not navigation params: params would serialize every seed into the
// URL.
let pendingQueue: PendingContact[] | null = null;

export function setPendingContactQueue(queue: PendingContact[]): void {
  pendingQueue = queue;
}

/** Read without clearing — safe to call from a React state initializer,
 * which must stay pure (StrictMode/concurrent React can replay it). */
export function peekPendingContactQueue(): PendingContact[] | null {
  return pendingQueue;
}

/** Clear after mount so a later visit to the add screen can't replay the batch. */
export function clearPendingContactQueue(): void {
  pendingQueue = null;
}
