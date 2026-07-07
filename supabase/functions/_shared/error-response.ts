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
