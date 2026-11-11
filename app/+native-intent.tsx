import type { Href } from "expo-router";
import { supabase } from "../lib/supabase";
import { setLaunchLink } from "../lib/launch-link";
import {
  flushPendingInvite,
  setPendingInviteCode,
} from "../lib/pending-invite";

// Universal links on https://begifted.vercel.app/open/* (claimed in
// public/.well-known/apple-app-site-association) and the in-app route each
// one opens. The /open/ prefix keeps the claim narrow: every other path on
// that host, including the auth email callbacks, stays a web page.
const OPEN_LINKS: Record<string, Href> = {
  "/open/add-person": "/contacts/add",
};

const INVITE_PATH = "/open/invite";

function inviteCodeOf(url: string): string | null {
  const match = /[?&]code=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

function pathnameOf(url: string): string {
  return url
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");
}

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  try {
    if (pathnameOf(path) === INVITE_PATH) {
      // An invite link has no screen of its own: the code waits on the device
      // and is redeemed by the auth gate once the friend has signed in.
      const code = inviteCodeOf(path);
      if (code) await setPendingInviteCode(code);
      if (initial) return "/";
      const { data } = await supabase.auth.getSession();
      if (data.session && code) void flushPendingInvite();
      return null;
    }

    const target = OPEN_LINKS[pathnameOf(path)];
    if (!target) return path;

    // The routes behind these links have no auth gate of their own; a cold
    // launch must pass through "/" first, which signs in or onboards the
    // user before following the link.
    if (initial) {
      setLaunchLink(target);
      return "/";
    }

    const { data } = await supabase.auth.getSession();
    return data.session ? String(target) : null;
  } catch {
    // A throw here crashes the app; landing on the gate is always safe.
    return "/";
  }
}
