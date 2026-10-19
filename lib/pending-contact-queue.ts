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

// Stored photo paths are relative to the photo folder: iOS can move the app
// container on update, which would orphan an absolute path.
const STORED_PHOTO_PREFIX = "unfinished-photo:";

function withPhotoPath(
  list: PendingContact[],
  convert: (uri: string) => string
): PendingContact[] {
  return list.map((p) =>
    p.seed.photoUri
      ? { ...p, seed: { ...p.seed, photoUri: convert(p.seed.photoUri) } }
      : p
  );
}

async function readList(userId: string): Promise<PendingContact[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return withPhotoPath(parsed, (uri) =>
      uri.startsWith(STORED_PHOTO_PREFIX)
        ? `${UNFINISHED_PHOTO_DIR}${uri.slice(STORED_PHOTO_PREFIX.length)}`
        : uri
    );
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
      const stored = withPhotoPath(list, (uri) =>
        uri.startsWith(UNFINISHED_PHOTO_DIR)
          ? `${STORED_PHOTO_PREFIX}${uri.slice(UNFINISHED_PHOTO_DIR.length)}`
          : uri
      );
      await AsyncStorage.setItem(storageKey(userId), JSON.stringify(stored));
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

async function deleteOwnPhoto(uri: string | undefined): Promise<void> {
  if (!uri?.startsWith(UNFINISHED_PHOTO_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
    () => undefined
  );
}

/** Remembers the picks and returns them in pick order. Someone already
 * waiting under the same name keeps their entry and progress instead of
 * gaining a duplicate; two same-named picks in one batch are different
 * contacts and both kept. */
export function addUnfinishedPeople(
  userId: string,
  seeds: PendingContactSeed[]
): Promise<PendingContact[]> {
  return serialized(async () => {
    const list = await readList(userId);
    const waiting = [...list];
    const picked: PendingContact[] = [];
    for (const seed of seeds) {
      const existing = waiting.find((p) => sameName(p.seed.name, seed.name));
      if (existing && !picked.includes(existing)) {
        picked.push(existing);
        await deleteOwnPhoto(seed.photoUri);
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
    await deleteOwnPhoto(entry.seed.photoUri);
  });
}

/** Removes a person whose conversation was refused. A refusal can land after
 * "Start fresh" has begun a new conversation for them; that one wasn't
 * refused, so the person stays. */
export function removeRefusedUnfinishedPerson(
  userId: string,
  id: string,
  refusedMessageIds: string[]
): Promise<void> {
  return serialized(async () => {
    const list = await readList(userId);
    const entry = list.find((p) => p.id === id);
    if (!entry) return;
    const holdsRefused =
      !entry.progress ||
      entry.progress.messages.some((m) => refusedMessageIds.includes(m.id));
    if (!holdsRefused) return;
    revokeWriters(id);
    await writeList(
      userId,
      list.filter((p) => p.id !== id)
    );
    await deleteOwnPhoto(entry.seed.photoUri);
  });
}

/** Forgets every unfinished person for a deleted account. */
export function clearUnfinishedPeople(userId: string): Promise<void> {
  return serialized(async () => {
    const list = await readList(userId);
    for (const entry of list) revokeWriters(entry.id);
    await writeList(userId, []);
    for (const entry of list) await deleteOwnPhoto(entry.seed.photoUri);
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
