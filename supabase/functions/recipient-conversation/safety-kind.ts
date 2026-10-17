import { callAI, CONVERSATION_MODEL, getApiKey } from "../_shared/ai-client.ts";
import type { SafetyKind } from "../_shared/error-response.ts";
import type { ModerationResult } from "../_shared/moderation.ts";

export type SelfHarmReading = "self" | "other" | "none";

// The moderation score can't separate "I want to end my life" from "help my
// brother end his" (both score as the writer's intent), nor milder intent from
// dark humor or ordinary sadness (same score band). This narrow check reads
// the conversation for those distinctions only. The safety preamble alone
// mislabels both: it answered "worried about you" for the brother case.
const SELF_HARM_CHECK_PROMPT = `You review a conversation from a gift-planning app. Decide whether it involves current self-harm, and whose. Answer with exactly one word.

SELF: the person writing says they currently want to hurt themselves or end their life, or wants a goodbye or final gift because of that.
OTHER: the person writing wants something another person could use to hurt themselves or end their life, or says another person is currently in danger of doing so.
NONE: anything else. This includes feeling sad or low, grief, someone who feels hopeless and could use something caring, self-harm in the past that is now better, dark humor and figures of speech ("work is killing him"), and ordinary gifting.

If both SELF and OTHER apply, answer SELF.`;

// Returns null when the check itself fails, so the caller can fail closed.
export async function readSelfHarm(
  messages: { role: string; content: unknown }[]
): Promise<SelfHarmReading | null> {
  try {
    const transcript = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const reply = await callAI(
      "openai",
      CONVERSATION_MODEL,
      getApiKey("openai"),
      {
        messages: [
          { role: "system", content: SELF_HARM_CHECK_PROMPT },
          { role: "user", content: transcript },
        ],
        maxTokens: 5,
        temperature: 0,
      }
    );
    const word = reply.trim().toUpperCase();
    if (word.startsWith("SELF")) return "self";
    if (word.startsWith("OTHER")) return "other";
    if (word.startsWith("NONE")) return "none";
    console.warn("[moderation] self-harm check gave no reading");
    return null;
  } catch (err) {
    console.warn(
      "[moderation] self-harm check failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

// What the moderation result means for this request: null to carry on, or the
// kind of safety response to stop with. A child-sexual hit keeps the plain
// decline even when self-harm also fired; crisis wording would misread it. A
// flagged self-harm hit always stops, and the check only picks whose crisis it
// is. A borderline score stops unless the check reads it as ordinary; a failed
// check stops too, since the score alone used to block these.
export async function moderationStopKind(
  moderation: ModerationResult,
  messages: { role: string; content: unknown }[]
): Promise<SafetyKind | null> {
  if (moderation.categories.includes("sexual/minors")) return "generic";
  if (!moderation.blocked && !moderation.selfHarmBorderline) return null;
  const reading = await readSelfHarm(messages);
  if (!moderation.blocked && reading === "none") return null;
  return reading === "other" ? "self_harm_other" : "self_harm";
}
