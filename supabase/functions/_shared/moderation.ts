// Deterministic input moderation gate. A cheap, fast pre-check that runs on
// user free-text BEFORE it reaches the generation model, for the categories we
// never want to depend solely on the model for. On a hit it fails closed —
// callers return the safety response and never generate.
//
// Scope is deliberately narrow (high precision): only truly-illegal categories
// block here. Everything else — stalking, boundary-pushing, jailbreaks — is
// left to the prompt-layer guidance, because false positives that block
// legitimate sensitive gifting read as broken to real users.

// Thresholds were tuned against the safety eval inputs (supabase/safety-evals):
//   - `sexual/minors`: the boolean flag fires ~0.67 for CSAM and 0.000 for all
//     legitimate gifting, so a 0.2 score floor adds recall headroom for milder
//     phrasings at no measured false-positive cost.
//   - `self-harm/intent`: the boolean flag MISSES milder intent ("I don't want
//     to be here anymore, help me pick a goodbye gift" scored 0.120 with the
//     flag false), while legitimate recovery gifting scored <0.01 — so a low
//     0.05 score floor catches the intent the flag misses with a wide margin.
// Both are conservative floors below the flag; revisit if the eval shows drift.
const SEXUAL_MINORS_SCORE_FLOOR = 0.2;
const SELF_HARM_INTENT_SCORE_FLOOR = 0.05;

export type ModerationResult = {
  blocked: boolean;
  // Matched category labels only — never the offending text, so callers can log
  // a flag event without retaining sensitive content.
  categories: string[];
};

export async function screenInput(
  text: string,
  apiKey: string
): Promise<ModerationResult> {
  if (!text.trim() || !apiKey) return { blocked: false, categories: [] };

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    });

    // Fail OPEN on an infrastructure error rather than block all gifting during
    // a moderation outage: the prompt-layer guidance still backstops the worst
    // categories, and OpenAI being down would fail the generation call anyway.
    // The event is logged so a silent gap is visible.
    if (!res.ok) {
      console.warn(
        `[moderation] screen HTTP ${res.status}; allowing (fail-open)`
      );
      return { blocked: false, categories: [] };
    }

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return { blocked: false, categories: [] };

    const cats: Record<string, boolean> = result.categories ?? {};
    const scores: Record<string, number> = result.category_scores ?? {};
    const hits: string[] = [];

    if (
      cats["sexual/minors"] ||
      (scores["sexual/minors"] ?? 0) >= SEXUAL_MINORS_SCORE_FLOOR
    ) {
      hits.push("sexual/minors");
    }
    if (
      cats["self-harm/intent"] ||
      cats["self-harm/instructions"] ||
      (scores["self-harm/intent"] ?? 0) >= SELF_HARM_INTENT_SCORE_FLOOR
    ) {
      hits.push("self-harm");
    }

    return { blocked: hits.length > 0, categories: hits };
  } catch (err) {
    console.warn(
      "[moderation] screen failed; allowing (fail-open):",
      err instanceof Error ? err.message : String(err)
    );
    return { blocked: false, categories: [] };
  }
}
