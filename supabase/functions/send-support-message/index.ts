// @ts-ignore - Deno HTTP imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { internalErrorResponse } from "../_shared/error-response.ts";

// Relays a Contact Us form submission to the support inbox via Resend.
// Server-side send (not a mailto handoff) so the user never leaves the app and
// the message arrives even if they have no mail client configured. reply-to is
// set to the sender's account email so support can answer directly.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_EMAIL = "support@bgftd.com";
// @ts-ignore - Deno env at runtime
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

type SupportMessageBody = {
  subject?: string;
  message?: string;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { user, errorResponse } = await requireUser(req, corsHeaders);
    if (errorResponse) return errorResponse;

    const body = (await req
      .json()
      .catch(() => null)) as SupportMessageBody | null;
    const subject =
      typeof body?.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!subject || !message) {
      return jsonResponse({ error: "Subject and message are required" }, 400);
    }
    if (
      subject.length > MAX_SUBJECT_LENGTH ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return jsonResponse({ error: "Subject or message is too long" }, 400);
    }

    if (!resendApiKey) {
      // Configuration failure on our side, not a bad request — surface as 500
      // so the client shows its generic try-again error.
      console.error("[send-support-message] RESEND_API_KEY is not set");
      return jsonResponse({ error: "Support sending is not configured" }, 500);
    }

    const senderEmail = user.email ?? "unknown";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // From must be on the Resend-verified domain; the user's own address
        // goes in reply_to so support replies reach them directly.
        from: `BeGifted Support <${SUPPORT_EMAIL}>`,
        to: [SUPPORT_EMAIL],
        reply_to: user.email ? [user.email] : undefined,
        subject: `[Support] ${subject}`,
        text: `${message}\n\n---\nFrom: ${senderEmail}\nUser ID: ${user.id}`,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text().catch(() => "");
      console.error(
        `[send-support-message] Resend send failed (${resendResponse.status}): ${detail}`
      );
      return jsonResponse({ error: "Failed to send message" }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    return internalErrorResponse("send-support-message", err, corsHeaders);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
