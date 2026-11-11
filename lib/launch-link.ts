import type { Href } from "expo-router";

// The universal link that cold-launched the app. app/+native-intent.tsx parks
// the target here and starts the app at "/", so the auth gate decides whether
// the user may go there — the same path a launch notification takes.
let pendingHref: Href | null = null;

export function setLaunchLink(href: Href): void {
  pendingHref = href;
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
