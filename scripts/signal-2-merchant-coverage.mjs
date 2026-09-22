#!/usr/bin/env node
// Signal 2 from docs/agentic-commerce-readiness.md: what fraction of our
// outbound clicks land on a merchant an agent could buy from?
//
// Shopify turned agent access on by default for eligible stores, so a
// Shopify-hosted storefront is the closest available proxy for "reachable."
// It is a proxy and not the answer: there is no public per-store way to check
// eligibility or whether the merchant opted out, so the number this prints is
// the ceiling of what default-on could deliver.
//
// Detection is storefront fingerprinting, which is one-sided — a positive is
// conclusive, a negative is not. Domains that bot-block the probe are reported
// as unresolved rather than folded into either side, which is why the result is
// a band. Widen SHOPIFY_STRONG rather than lowering the loose threshold if a
// storefront is missed; the loose count alone matches sites that merely mention
// Shopify in prose.
//
// DNS runs only after HTTP comes back inconclusive. It is the one signal a
// bot-blocking storefront cannot withhold, and it rescues real stores from the
// unresolved bucket — but Shopify sites behind a CDN look like the CDN, so a
// DNS miss means nothing.
//
// Env: SUPABASE_ACCESS_TOKEN (required), SUPABASE_PROJECT_REF (required).
// Usage: node scripts/signal-2-merchant-coverage.mjs [--json]

import { Resolver } from "node:dns/promises";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.error(
    "SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF must both be set."
  );
  process.exit(1);
}

const CONCURRENCY = 12;
const TIMEOUT_MS = 20_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Headers only Shopify sets.
const SHOPIFY_HEADERS =
  /x-shopid|x-shopify|x-sorting-hat-shopid|_shopify_y|powered-by: ?shopify/i;
// Asset paths a non-Shopify storefront has no reason to serve.
const SHOPIFY_STRONG =
  /cdn\.shopify\.com|shopifycdn\.com|myshopify\.com|Shopify\.theme|shopify-features|shopify-boomerang|\/cdn\/shop\//gi;
// A storefront that names Shopify this often is running on it; one or two
// mentions is usually a footer credit or a blog post.
const LOOSE_MIN = 5;
// Shopify's own front door, for apex domains that cannot CNAME.
const SHOPIFY_A_PREFIX = "23.227.38.";

const resolver = new Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

async function looksShopifyByDns(domain) {
  try {
    const cnames = await resolver.resolveCname(domain);
    if (cnames.some((c) => c.includes("myshopify.com"))) return true;
  } catch {
    // No CNAME is the common case for an apex domain.
  }
  try {
    const a = await resolver.resolve4(domain);
    return a.some((ip) => ip.startsWith(SHOPIFY_A_PREFIX));
  } catch {
    return false;
  }
}

async function queryClicks() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `select lower(retailer_domain) as domain, count(*)::int as clicks
                from outbound_clicks
                where retailer_domain is not null
                group by 1 order by 2 desc, 1`,
      }),
    }
  );
  if (!res.ok) throw new Error(`Supabase query failed: ${res.status}`);
  return res.json();
}

async function classify(domain) {
  let res;
  try {
    res = await fetch(`https://${domain}/`, {
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return (await looksShopifyByDns(domain))
      ? { domain, verdict: "shopify", why: "dns" }
      : { domain, verdict: "unresolved", why: "no response" };
  }

  for (const [k, v] of res.headers) {
    if (SHOPIFY_HEADERS.test(`${k}: ${v}`)) {
      return { domain, verdict: "shopify", why: "header" };
    }
  }

  let body = "";
  try {
    body = await res.text();
  } catch {
    return (await looksShopifyByDns(domain))
      ? { domain, verdict: "shopify", why: "dns" }
      : { domain, verdict: "unresolved", why: "body read failed" };
  }

  const strong = (body.match(SHOPIFY_STRONG) || []).length;
  const loose = (body.match(/shopify/gi) || []).length;
  if (strong >= 1 || loose >= LOOSE_MIN) {
    return {
      domain,
      verdict: "shopify",
      why: `strong:${strong} loose:${loose}`,
    };
  }
  // A challenge page is not evidence either way, so fall back to DNS.
  if (!res.ok) {
    return (await looksShopifyByDns(domain))
      ? { domain, verdict: "shopify", why: "dns" }
      : { domain, verdict: "unresolved", why: `http ${res.status}` };
  }
  return { domain, verdict: "other", why: `loose:${loose}` };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

const pct = (n, d) => (d === 0 ? "  n/a" : `${((n / d) * 100).toFixed(1)}%`);

const rows = await queryClicks();
const clicks = new Map(rows.map((r) => [r.domain, r.clicks]));
const results = await mapLimit([...clicks.keys()], CONCURRENCY, classify);

const bucket = { shopify: [], unresolved: [], other: [] };
for (const r of results) bucket[r.verdict].push(r.domain);

const weigh = (ds) => ds.reduce((n, d) => n + clicks.get(d), 0);
const total = weigh([...clicks.keys()]);
const sc = weigh(bucket.shopify);
const uc = weigh(bucket.unresolved);
const oc = weigh(bucket.other);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ total, results, clicks: [...clicks] }, null, 2));
  process.exit(0);
}

console.log(
  `\nSIGNAL 2 — as-ranked. ${total} clicks across ${clicks.size} domains\n`
);
const line = (label, c, ds) =>
  console.log(
    `  ${label.padEnd(28)}${String(c).padStart(4)} clicks ${pct(c, total).padStart(7)}` +
      `    ${String(ds.length).padStart(3)} domains ${pct(ds.length, clicks.size).padStart(7)}`
  );
line("Shopify, agent-reachable", sc, bucket.shopify);
line("unresolved (bot-blocked)", uc, bucket.unresolved);
line("confirmed not Shopify", oc, bucket.other);
console.log(
  `\n  ${pct(sc, total)} confirmed, band ${pct(sc, total)}–${pct(sc + uc, total)}` +
    `   (step 6 scouting threshold: ~30%)\n`
);

// Coverage concentrated in the long tail is Path A; concentrated in the head is
// Path B. The bands are click volume per domain, the only proxy for merchant
// size this table carries.
console.log("Shape — Shopify share by click-volume band:");
const shopify = new Set(bucket.shopify);
for (const [label, test] of [
  ["head (3+ clicks)", (c) => c >= 3],
  ["middle (2 clicks)", (c) => c === 2],
  ["long tail (1 click)", (c) => c === 1],
]) {
  const ds = [...clicks.keys()].filter((d) => test(clicks.get(d)));
  const s = weigh(ds.filter((d) => shopify.has(d)));
  const t = weigh(ds);
  console.log(
    `  ${label.padEnd(22)}${String(s).padStart(3)}/${String(t).padEnd(4)} = ${pct(s, t)}`
  );
}

if (bucket.unresolved.length) {
  console.log("\nUnresolved, by clicks:");
  for (const d of bucket.unresolved.sort(
    (a, b) => clicks.get(b) - clicks.get(a)
  )) {
    console.log(`  ${String(clicks.get(d)).padStart(3)}  ${d}`);
  }
}
