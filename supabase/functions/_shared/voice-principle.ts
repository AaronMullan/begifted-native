/**
 * BeGifted's brand voice is maintained in the active gift_generation_system
 * prompt (edited through the admin playground), so any other surface that
 * needs it must read it at runtime — copying the text into a function would
 * let the two drift apart, and the copy would win silently.
 *
 * The coupling is by heading, which makes a rename in the playground enough to
 * break it. Keep VOICE_PROMPT_KEY/VOICE_HEADING in step with the deploy-time
 * guard in lib/prompt-registry.ts (`requiredSections`), which is what tells a
 * human they are about to sever this.
 */
export const VOICE_PROMPT_KEY = "gift_generation_system";
export const VOICE_HEADING = "EDITORIAL VOICE AND REASON QUALITY:";

/**
 * A heading is a whole line of caps ending in a colon. Underscores count:
 * without them `NO_RESULTS:` reads as body text and the section swallows the
 * no-results rules, which tell a model to emit a different JSON shape.
 */
const HEADING_LINE = /^[A-Z][A-Z0-9_ &'/-]*:\s*$/m;

/**
 * Returns the voice section of `promptText`, or "" when the heading is gone —
 * callers synthesize without it rather than failing outright.
 */
export function extractVoicePrinciple(promptText: string): string {
  const start = promptText.indexOf(VOICE_HEADING);
  if (start === -1) return "";
  const rest = promptText.slice(start + VOICE_HEADING.length);
  const nextHeading = rest.match(HEADING_LINE);
  const body = nextHeading ? rest.slice(0, nextHeading.index) : rest;
  return body.trim();
}
