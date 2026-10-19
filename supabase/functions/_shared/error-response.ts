// Calm, app-owned message shown when a model refuses (or returns off-task prose
// where structured output was required). Deliberately neutral: the category is
// not classified here, so it must read appropriately whether the trigger was a
// jailbreak attempt, a disallowed request, or a distressing one. A deterministic
// input screen and any category-specific response are separate concerns.
export const SAFETY_DECLINE_MESSAGE =
  "This isn't something BeGifted can help with, so I've stopped here rather than guess. If that wasn't what you meant, try rephrasing what you're looking for.";

// Self-harm stops answer with crisis resources instead of "try rephrasing".
// `self_harm` is the user's own current intent; `self_harm_other` is a request
// that would help someone else hurt themselves, or someone else in danger,
// worded so the giver isn't treated as the one at risk. The wording is the
// product owner's and is final.
export type SafetyKind = "self_harm" | "self_harm_other" | "generic";

export const SAFETY_MESSAGES: Record<SafetyKind, string> = {
  self_harm:
    "I’m sorry you’re going through this. Your safety matters more than finishing this right now.\nIf you’re in the U.S., you can call or text 988 to speak with a crisis counselor, anytime. If you might hurt yourself soon or are in immediate danger, call 911 or go to the nearest emergency department.\nWe’ll stop this gift setup here.",
  self_harm_other:
    "I’m concerned about their safety. I can’t recommend something that could help a person hurt themselves.\nIf you’re in the U.S., you can call or text 988 for guidance on supporting someone else. If they’re in immediate danger, call 911.\nWe’ll stop this gift setup here.",
  generic: SAFETY_DECLINE_MESSAGE,
};

// Fail-closed response for a model refusal: 200 (not an error) so clients read
// the body and render the message. The superset of fields lets every caller
// read its own shape — the recipient-conversation chat renders `reply`, the
// gift flow reads `status`/`suggestions` — without special-casing per function.
// `safety_kind` tells the app whether to hold the crisis message on screen.
export function safetyDeclinedResponse(
  corsHeaders: Record<string, string>,
  kind: SafetyKind = "generic"
): Response {
  const message = SAFETY_MESSAGES[kind];
  return new Response(
    JSON.stringify({
      safety_declined: true,
      safety_kind: kind,
      message,
      reply: message,
      status: "safety_declined",
      suggestions: [],
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Top-level catch handler for edge functions. Raw error messages embed
// upstream provider error bodies (see ai-client.ts throws) and stacks leak
// file paths, so clients only ever get a generic message plus a request ID
// that can be matched against the full error in the Supabase function logs.
export function internalErrorResponse(
  functionName: string,
  error: unknown,
  corsHeaders: Record<string, string>
): Response {
  const requestId = crypto.randomUUID();
  // A SyntaxError from JSON.parse quotes the start of its input, which is
  // usually model output built from what the user typed. Only the stack frames
  // are kept: the quoted input can itself contain newlines, so dropping just
  // the stack's first line would still leak the rest of it.
  const logged =
    error instanceof SyntaxError
      ? [
          "SyntaxError (message withheld)",
          ...(error.stack ?? "")
            .split("\n")
            .filter((line) => line.trimStart().startsWith("at ")),
        ].join("\n")
      : error;
  console.error(`[${functionName}] requestId=${requestId}`, logged);
  return new Response(
    JSON.stringify({ error: "Internal server error", requestId }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
