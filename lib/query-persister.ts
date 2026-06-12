/**
 * TanStack Query persistence to AsyncStorage
 * Keeps recipients, occasions, and profile across app restarts for faster
 * loads on slow networks. FAQs are intentionally NOT persisted so copy edits
 * (repo fallback or Google Sheet) show on the next mount rather than being
 * shadowed by a stale on-disk cache for up to 24h.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const PERSIST_KEY = "BEGIFTED_QUERY_CACHE";

/** How long persisted data is considered valid (24 hours) */
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Query key prefixes we persist (recipients, occasions, profile, giftSuggestions) */
const PERSISTED_QUERY_KEYS = new Set([
  "profile",
  "recipients",
  "occasions",
  "giftSuggestions",
]);

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  throttleTime: 1000,
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
      const key = query.queryKey[0];
      return typeof key === "string" && PERSISTED_QUERY_KEYS.has(key);
    },
  },
} as const;
