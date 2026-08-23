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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remove any "[recipientName]'s all set." / "[recipientName] is all set."
 * completion sentence the reply LLM emitted, for the given recipient.
 *
 * Anchored to the actual recipient name (the exact token the runtime's own
 * completion copy uses) rather than a freeform pattern, so it (a) matches
 * accented/non-ASCII names literally — an ASCII word-class would leave
 * "José's all set." intact — and (b) never touches ordinary prose that merely
 * contains the words "all set" ("once the venue is all set, …"). The clause
 * must end at terminal punctuation or end-of-string, so "[Name] is all set in
 * their ways" is left alone. Global + case-insensitive so a leaked close is
 * removed wherever it lands.
 */
export function stripAllSetCompletion(
  text: string,
  recipientName?: string | null
): string {
  const name = recipientName?.trim();
  if (!name) return text.trim();
  const n = escapeRegExp(name);
  const re = new RegExp(
    `\\s*${n}(?:['’]s|\\s+is)\\s+all set(?:[.!?]+|$)`,
    "giu"
  );
  return text
    .replace(re, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Drop any interrogative sentence from a completion-turn recognition line.
 *
 * On the ready/acknowledgment turn every required field is already satisfied in
 * canonical state, so the reply LLM's recognition sentence must be declarative —
 * yet it sometimes appends a spurious required-field question for a field that is
 * already captured ("…a clear aesthetic preference. What's your relationship to
 * Sarah?"). Left in place, that question ships alongside the runtime-appended
 * close, producing the mutually-exclusive "…relationship to Sarah? Sarah's all
 * set." The completion contract — a required-field question can never share a
 * response with the close — is enforced here by construction, for ANY field, so
 * no per-field special-casing is needed.
 *
 * Splits into sentences on terminal punctuation and keeps only the ones that do
 * NOT end in a question mark. Returns "" when nothing declarative remains, so the
 * caller falls back to the close alone.
 *
 * Pure module — no env, no AI, no I/O — so Deno tests can import it directly.
 */
export function stripQuestions(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!sentences) return text.trim();
  return sentences
    .filter((s) => !/\?\s*$/.test(s.trim()))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
