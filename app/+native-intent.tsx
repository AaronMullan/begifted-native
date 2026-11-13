import type { Href } from "expo-router";
import { supabase } from "../lib/supabase";
import { setLaunchLink } from "../lib/launch-link";

const HOME: Href = "/dashboard";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Query = Record<string, string>;

function idParam(query: Query, key: string): string | null {
  const value = query[key];
  return value && UUID_RE.test(value) ? value : null;
}

// Universal links on https://begifted.vercel.app/open/* (claimed in
// public/.well-known/apple-app-site-association) and the in-app route each
// one opens. The /open/ prefix keeps the claim narrow: every other path on
// that host, including the auth email callbacks, stays a web page. Query
// parameter names match the Customer.io event properties, so an email
// template can pass {{event.recipient_id}} straight through. A link whose
// id is missing or malformed (an unfilled template variable) opens Home
// rather than a broken person screen.
const OPEN_LINKS: Record<string, (query: Query) => Href> = {
  "/open/add-person": () => "/contacts/add",
  "/open/add-moment": (query) => {
    const recipientId = idParam(query, "recipient_id");
    return recipientId ? `/contacts/${recipientId}?addOccasion=true` : HOME;
  },
  "/open/gift-ideas": (query) => {
    const recipientId = idParam(query, "recipient_id");
    if (!recipientId) return HOME;
    const occasionId = idParam(query, "occasion_id");
    return occasionId
      ? `/contacts/${recipientId}?tab=gifts&occasionId=${occasionId}`
      : `/contacts/${recipientId}?tab=gifts`;
  },
  "/open/billing": () => "/settings/billing",
  "/open/home": () => HOME,
};

function stripOrigin(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "");
}

function pathnameOf(url: string): string {
  return stripOrigin(url).split(/[?#]/)[0].replace(/\/+$/, "");
}

function queryOf(url: string): Query {
  const search = stripOrigin(url).split("#")[0].split("?")[1] ?? "";
  const query: Query = {};
  for (const pair of search.split("&")) {
    if (!pair) continue;
    const [key, value = ""] = pair.split("=");
    try {
      query[decodeURIComponent(key)] = decodeURIComponent(
        value.replace(/\+/g, " ")
      );
    } catch {
      // A malformed escape drops that one parameter, not the whole link.
    }
  }
  return query;
}

export async function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): Promise<string | null> {
  try {
    const route = OPEN_LINKS[pathnameOf(path)];
    if (!route) return path;
    const target = route(queryOf(path));

    // The routes behind these links have no auth gate of their own; a cold
    // launch must pass through "/" first, which signs in or onboards the
    // user before following the link. The gate already lands on Home, so
    // parking Home would push a second copy of it.
    if (initial) {
      if (target !== HOME) setLaunchLink(target);
      return "/";
    }

    const { data } = await supabase.auth.getSession();
    return data.session ? String(target) : null;
  } catch {
    // A throw here crashes the app; landing on the gate is always safe.
    return "/";
  }
}
