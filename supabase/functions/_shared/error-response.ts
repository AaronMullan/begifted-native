// Calm, app-owned message shown when a model refuses (or returns off-task prose
// where structured output was required). Deliberately neutral: the category is
// not classified here, so it must read appropriately whether the trigger was a
// jailbreak attempt, a disallowed request, or a distressing one. A deterministic
// input screen and any category-specific response are separate concerns.
export const SAFETY_DECLINE_MESSAGE =
  "This isn't something BeGifted can help with, so I've stopped here rather than guess. If that wasn't what you meant, try rephrasing what you're looking for.";

// Fail-closed response for a model refusal: 200 (not an error) so clients read
// the body and render the message. The superset of fields lets every caller
// read its own shape — the recipient-conversation chat renders `reply`, the
// gift flow reads `status`/`suggestions` — without special-casing per function.
export function safetyDeclinedResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      safety_declined: true,
      message: SAFETY_DECLINE_MESSAGE,
      reply: SAFETY_DECLINE_MESSAGE,
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
  console.error(`[${functionName}] requestId=${requestId}`, error);
  return new Response(
    JSON.stringify({ error: "Internal server error", requestId }),
    {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
