// @ts-ignore - Deno-style ESM import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore - Deno environment variables are resolved at runtime
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

export type VerifiedUser = { id: string; email?: string };

type RequireUserResult =
  | { user: VerifiedUser; errorResponse: null }
  | { user: null; errorResponse: Response };

/**
 * Verify the caller's JWT and return the authenticated user, or a ready-made
 * 401 Response. The anon key that ships in the app bundle is NOT a user: a
 * bare `Bearer <anon key>` header fails `auth.getUser()` here, so every
 * function behind this helper is unreachable to anonymous internet callers.
 *
 * Callers must still authorize any target ID from the request body against
 * `user.id` — authentication alone does not stop one user acting on another
 * user's rows.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<RequireUserResult> {
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { headers: jsonHeaders, status: 401 }
      ),
    };
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      errorResponse: new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { headers: jsonHeaders, status: 401 }
      ),
    };
  }

  return { user, errorResponse: null };
}
