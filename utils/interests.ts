// Apply an interests delta from an update conversation to the current list:
// keep what's there, drop the removed ones, append the newly-liked ones —
// case-insensitive, order-preserving. Reconciling (rather than overwriting with
// the extractor's freshly-mentioned interests) is what prevents an update like
// "she likes jewelry" from wiping everything else we know (DEV-119).
export function reconcileInterests(
  current: string[],
  added: string[],
  removed: string[]
): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const tokenize = (s: string) =>
    norm(s)
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  const removedList = removed.filter(
    (i): i is string => typeof i === "string" && i.trim().length > 0
  );
  const removedSet = new Set(removedList.map(norm));
  // The extractor's removal wording rarely equals the stored string ("fishing"
  // vs "fly fishing occasionally"), so exact matching alone strands interests
  // the user explicitly dropped. A stored interest also matches a removal when
  // every word of the removal appears in it — allowing shared-stem pairs like
  // "fish"/"fishing", but only for stems of 4+ characters so short words can't
  // collide ("art" must not remove "martial arts").
  const stemMatch = (a: string, b: string) =>
    a === b ||
    (a.length >= 4 && b.startsWith(a)) ||
    (b.length >= 4 && a.startsWith(b));
  const matchesRemoved = (value: string) => {
    if (removedSet.has(norm(value))) return true;
    const valueTokens = tokenize(value);
    return removedList.some((r) => {
      const removedTokens = tokenize(r);
      return (
        removedTokens.length > 0 &&
        removedTokens.every((rt) => valueTokens.some((vt) => stemMatch(rt, vt)))
      );
    });
  };
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of [...current, ...added]) {
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    const key = norm(value);
    if (!value || matchesRemoved(value) || seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}
