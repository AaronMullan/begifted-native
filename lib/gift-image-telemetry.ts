import * as Sentry from "@sentry/react-native";
import { retailerDomain } from "./open-link";
import type { GiftSuggestion } from "../types/recipient";

export type GiftImageOutcome =
  // Backend stored no image_url — the card was always going to be image-less.
  | "no_image_url"
  // Bitmap fetched and accepted for display.
  | "loaded"
  // Had a url but the remote fetch/decode failed (hotlink block, 403/404,
  // expired or redirected url, CORS, transient network).
  | "load_error"
  // Rendered but below the usable size floor (tracking pixels, tiny thumbs).
  | "too_small";

type LogGiftImageOutcomeInput = {
  suggestion: GiftSuggestion;
  outcome: GiftImageOutcome;
  width?: number;
  height?: number;
  error?: string;
};

function imageHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// Per-image render telemetry. The display-rate symptom in DEV-186 was invisible
// because the renderer silently hid any image whose probe failed or measured
// small. This makes the two failure classes the ticket cares about distinct and
// countable: "backend returned no image" (no_image_url) vs "frontend got a url
// but it never rendered" (load_error / too_small). Sentry auto-attaches the
// release (build) and session, so a per-build render-failure rate is queryable
// off these events without a new table.
export function logGiftImageOutcome({
  suggestion,
  outcome,
  width,
  height,
  error,
}: LogGiftImageOutcomeInput): void {
  const data = {
    giftId: suggestion.id,
    title: suggestion.title,
    retailer: suggestion.link ? retailerDomain(suggestion.link) : null,
    productUrlPresent: Boolean(suggestion.link),
    imageUrlPresent: Boolean(suggestion.image_url),
    imageHost: imageHost(suggestion.image_url),
    width: width ?? null,
    height: height ?? null,
    error: error ?? null,
  };

  Sentry.addBreadcrumb({
    category: "gift_image",
    level: outcome === "loaded" ? "info" : "warning",
    message: `gift image ${outcome}`,
    data,
  });

  // A url that fails to render is the surprising, previously-swallowed case —
  // capture it as a standalone event so the by-build failure rate is queryable.
  // "no_image_url" is already measurable from the gift_suggestions table, so it
  // stays a breadcrumb only to avoid flooding Sentry with the common case.
  if (outcome === "load_error" || outcome === "too_small") {
    Sentry.captureMessage(`gift image ${outcome}`, {
      level: "warning",
      tags: {
        source: "gift_image",
        outcome,
        image_host: data.imageHost ?? "unknown",
        retailer: data.retailer ?? "unknown",
      },
      contexts: { gift_image: data },
    });
    console.warn(`[gift-image] ${outcome}`, data);
  } else if (__DEV__) {
    console.log(`[gift-image] ${outcome}`, data);
  }
}
