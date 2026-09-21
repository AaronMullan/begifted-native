/**
 * Canonical form of an occasion name, used as its `occasion_type` and as the
 * key into the date catalog. Lives here rather than beside its consumers so
 * that pure modules can use it without pulling in the Supabase client.
 *
 * Curly apostrophes are stripped before anything else — iOS keyboards type
 * "Mother’s Day", and the straight-quote form has to slug identically.
 */
export function slugifyOccasionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
