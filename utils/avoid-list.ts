// recipients.avoid_list also holds bare product titles appended by the
// gift-feedback trigger. Entries from a giver's own words carry a prefix so
// "already owns a Kindle" keeps its meaning next to "avoid Kindles" — the
// generation prompt blocks both, but only the prefix tells them apart.
export const OWNED_PREFIX = "Already owns: ";
export const AVOID_PREFIX = "Avoid: ";

// The model sometimes repeats the verb it was told to drop ("no food gifts",
// "avoid candles"), which would double up inside the prefix and the snackbar.
const OWNED_VERB = /^already (owns|has)\s+/i;
// "No" only before a lowercase word, so a title like "No Man's Sky" survives.
const AVOID_VERB = /^(?:[Aa]void\s+|[Nn]o\s+(?=[a-z]))/;
const PLACEHOLDERS = new Set(["null", "undefined", "none", "n/a"]);

const cleanItems = (items: unknown, leadingVerb: RegExp): string[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of items) {
    if (typeof raw !== "string") continue;
    const value = raw.trim().replace(leadingVerb, "").trim();
    const key = value.toLowerCase();
    if (!value || PLACEHOLDERS.has(key) || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(value);
  }
  return cleaned;
};

export type AvoidListMerge = {
  // null when nothing new was added, so the caller leaves the column alone.
  avoidList: string[] | null;
  addedOwned: string[];
  addedAvoid: string[];
};

// Append-only: an entry is never removed because a later note didn't mention
// it. Removing one is not something a note can do.
export function mergeAvoidList(
  current: string[] | null | undefined,
  owned: unknown,
  avoid: unknown
): AvoidListMerge {
  const existing = (current ?? []).filter(
    (entry): entry is string => typeof entry === "string"
  );
  const seen = new Set(existing.map((entry) => entry.trim().toLowerCase()));
  const merged = [...existing];
  const take = (items: string[], prefix: string) =>
    items.filter((item) => {
      const entry = `${prefix}${item}`;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      merged.push(entry);
      return true;
    });
  const addedOwned = take(cleanItems(owned, OWNED_VERB), OWNED_PREFIX);
  const addedAvoid = take(cleanItems(avoid, AVOID_VERB), AVOID_PREFIX);
  return {
    avoidList: addedOwned.length + addedAvoid.length > 0 ? merged : null,
    addedOwned,
    addedAvoid,
  };
}

const joinItems = (items: string[]): string => {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

// "Michelle already has a Kindle. No food gifts for Michelle." — or "" when
// the note added nothing to the list.
export function describeAvoidAdditions(
  name: string,
  addedOwned: string[],
  addedAvoid: string[]
): string {
  const sentences: string[] = [];
  if (addedOwned.length > 0) {
    sentences.push(`${name} already has ${joinItems(addedOwned)}.`);
  }
  if (addedAvoid.length > 0) {
    sentences.push(`No ${joinItems(addedAvoid)} for ${name}.`);
  }
  return sentences.join(" ");
}
