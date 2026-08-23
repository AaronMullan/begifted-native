/**
 * Runtime-owned completion-line handling for the add-recipient flow.
 *
 * The closing line "[Name]'s all set." is owned by the runtime so completion
 * copy stays consistent and can only appear once the deterministic readiness
 * gate reaches "ready". The reply LLM must never introduce it: on a non-ready
 * turn it produces the contradiction of a required-field question shipping
 * alongside a completion (e.g. "About how old is Daniel? Daniel's all set.").
 *
 * Pure module — no env, no AI, no I/O — so Deno tests can import it directly.
 */

// Global + case-insensitive so a leaked close is removed wherever it lands, not
// only at the end. Matches "[Name]'s all set" and "[Name] is all set".
const ALL_SET_COMPLETION_RE =
  /\s*\b[A-Za-z][A-Za-z'’\- ]*\b(?:['’]s|is)\s+all set[.!?]*/gi;

export function stripAllSetCompletion(text: string): string {
  return text
    .replace(ALL_SET_COMPLETION_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
