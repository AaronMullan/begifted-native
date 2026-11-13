import type { Href } from "expo-router";

// The universal link that cold-launched the app. app/+native-intent.tsx parks
// the target here and starts the app at "/", so the auth gate decides whether
// the user may go there — the same path a launch notification takes.
let pendingHref: Href | null = null;
let survivesSignIn = false;

/**
 * `survivesSignIn` marks a link that names no account's data (Invite Friends),
 * so it may still be followed after a signed-out user signs in. Links that
 * carry a person or moment id must not follow whichever account signs in.
 */
export function setLaunchLink(
  href: Href,
  options: { survivesSignIn?: boolean } = {}
): void {
  pendingHref = href;
  survivesSignIn = options.survivesSignIn ?? false;
}

export function consumeLaunchLink(): Href | null {
  const href = pendingHref;
  pendingHref = null;
  return href;
}

/** Drops a launch link the current session may not act on. */
export function discardLaunchLink(): void {
  pendingHref = null;
}

/** Drops a launch link unless it is safe to follow for any account. */
export function discardAccountLaunchLink(): void {
  if (!survivesSignIn) pendingHref = null;
}
