import * as Sentry from "@sentry/react-native";
import { Linking } from "react-native";

/**
 * Open a URL in the system browser (Safari on iOS / Chrome on Android).
 *
 * Product/retailer links must use the system browser, NOT an in-app sheet:
 * on iOS the in-app browser is `SFSafariViewController`, a sandbox that can't
 * open popups/new windows — so Shopify accelerated checkout, Shop Pay, Apple
 * Pay / PayPal handoff silently fail — and has an isolated cookie store, so
 * logins and saved cards aren't shared. See DEV-149 (reverses DEV-128).
 *
 * This is the single sanctioned open path for product/retailer links — route
 * every one through here (not a bare `Linking.openURL`) so behaviour stays
 * uniform and every open is telemetry-logged with a copy-link fallback.
 *
 * Returns `true` if the link opened, `false` otherwise. Open failures are
 * reported to Sentry rather than swallowed; callers should surface a fallback
 * (e.g. offer to copy the link) when this returns `false`.
 */
export async function openLink(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: "open-product-link" },
      extra: { url },
    });
    return false;
  }
}

/**
 * Derive the retailer domain from a product URL for engagement analytics
 * (DEV-151), e.g. "https://www.amazon.com/dp/123" -> "amazon.com". Relies on
 * the global `URL` registered by react-native-url-polyfill (imported in
 * lib/supabase.ts). Returns null when the URL can't be parsed.
 */
export function retailerDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
