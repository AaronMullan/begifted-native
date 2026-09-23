# Shopify UCP — what a standard-tier integration would involve

Companion to `docs/agentic-commerce-readiness.md`, which establishes _why_ this is
worth looking at: 57% of our outbound clicks land on Shopify-hosted merchants,
and Shopify's agent surface has been self-serve since June 17, 2026. This
document is the _what_ — read from Shopify's developer documentation and the UCP
specification rather than from coverage, and mapped against the pipeline we
already run.

Scope: the **standard tier** only. That means discovery and cart building, with
the buyer finishing on the merchant's own checkout. Completing a purchase
in-app is deliberately out of scope; see "The tier we would not use."

**Status, September 23, 2026: not pursuing.** Two spikes tested both uses of
the catalog — finding gifts with it, and confirming gifts web search had
already found — and neither earns an integration. See "What the September 23
spikes found." The rest of this document is the design as it stood before
those tests.

## The problem this solves

Our pipeline finds real products and then struggles to read them.

Discovery is already grounded. Generation runs through a provider web-search
tool — OpenAI `web_search`, Gemini `googleSearch`, Anthropic `web_search_20250305`
— and the run records its search queries and cited URLs. The model is choosing
among pages that search returned, not recalling URLs from training. The
telemetry says so: **3 dead links out of 154**, about 2%.

Verification is built and reasonably careful. `lib/services/link-check.ts` in
the sibling `be-gifted` repo reads each product page through three readers in
order — Shopify storefront product JSON, JSON-LD, then OpenGraph — and returns
price, price range, and availability. Generation applies it once;
`lib/services/suggestion-recheck.ts` applies it again on notification day,
retires anything dead or sold out so the slot can be refilled, and corrects a
stored price that has drifted more than 15% from the page. A blocked or
unreadable page is explicitly treated as unknown rather than as a verdict.

The weak link is between the two: **the page exists, and we often can't read
it.** Product facts live in HTML written for browsers, behind bot defenses that
don't care why we're asking (`gift_generation_runs.link_check`, 154 links since
mid-September):

| outcome         | count | share |
| --------------- | ----: | ----: |
| readable        |   107 |   68% |
| blocked         |    25 |   16% |
| unreadable      |    17 |   11% |
| unknown         |     5 |    3% |
| dead            |     3 |       |
| out_of_stock    |     3 |       |
| price_corrected |     5 |       |

Just under a third of the products we recommend ship without us confirming
price, stock or variant — 16% because the store blocked us, 11% because the
page carried no structure we could parse, 3% because the read timed out. Those
suggestions still go out, and should: treating a bot wall as "probably fine"
beats retiring good products over our own inability to read a page. But it
means roughly one card in three is a real product we are describing partly on
the search result's word.

There is a second cost. The Shopify reader fetches `/products/<handle>.js` as an
unauthenticated visitor, and carries a 429 backoff because Shopify's storefront
limiter throttles us. We are already a rate-limited guest at the door of the
API this document is about.

## What the standard tier gives us

Three MCP endpoints, JSON-RPC 2.0, conforming to the
[UCP specification](https://ucp.dev/2026-08-25/specification/overview/):

- **Global Catalog** — `https://catalog.shopify.com/api/ucp/mcp`. One endpoint,
  every Shopify merchant. `search_catalog` takes free text, an image, or a set
  of product IDs to find similar items; `lookup_catalog` resolves known
  identifiers; `get_product` returns full variant detail and a seller checkout
  link for the chosen variant. Results cluster by Universal Product ID across
  merchants, so the same item from three shops arrives as one row with three
  offers.
- **Cart** — `https://{shop-domain}/api/ucp/mcp`, per merchant. Build and
  iterate on a cart across conversational turns, estimate totals, apply
  localization.
- **Checkout** — same per-merchant endpoint. Convert a cart to a checkout and
  receive a `continue_url` that hands the buyer to the merchant's own storefront
  to pay. The docs are explicit that this is the normal path: "For general
  access, directing buyers to that `continue_url` is how checkout completes; you
  do not call `complete_checkout`."

Filters that matter for gifting: `filters.available` defaults to true, so
discovery returns only sale-ready items — out-of-stock stops being something we
detect after the fact. `filters.ships_to` takes country, region and postal code,
which is the question "will this reach them" asked at selection time rather than
at checkout.

Two capabilities worth noting for later rather than now. `catalog.like` accepts
an image for visual-similarity or multimodal search. And `metadata.attributes`
carries inferred attributes including occasion — though Shopify flags every
inferred field as "discovery and merchandising signals, not merchant-authored
source text," which is a lower evidentiary bar than our suggestions should rest
on.

## Which tier, and what it costs us in commitments

Access is classified into three tiers by how the agent identifies itself.

| tier          | how                                                     | catalog | cart | checkout build | `complete_checkout` | orders |
| ------------- | ------------------------------------------------------- | ------- | ---- | -------------- | ------------------- | ------ |
| **Anonymous** | no credential, no signature                             | yes     | yes  | yes            | no                  | no     |
| **Signed**    | ECDSA P-256 HTTP Message Signatures (RFC 9421)          | yes     | yes  | yes            | no                  | no     |
| **Token**     | credential issued through Shopify's developer dashboard | yes     | yes  | yes            | with shop grant     | yes    |

Rate limits scale with identification — anonymous lowest, token highest. Shopify
publishes no numbers anywhere, only the relative ordering.

Every request carries `meta.ucp-agent.profile`, a URL pointing at a JSON
document **we host ourselves** declaring our protocol version and capabilities.
Shopify fetches it, intersects our declared capabilities with what the shop
supports, and settles on the active set for the session. This is the detail that
settles the readiness doc's open question: the profile is a self-published
capability declaration, not a registration with anybody. Publishing one does not
make us "the registered agent" that rule two forbids. The natural home is
`/.well-known/ucp` on a domain we control — the `be-gifted` Next.js app can
serve it.

**Start anonymous.** It reaches the catalog, costs nothing, commits to nothing,
and tells us within a day whether the results are good enough to build on. Move
to signed only if the rate limits bind; that is a keypair and a signing
middleware, still no account.

## The tier we would not use

`complete_checkout` is gated twice, and neither gate is ours to open. Shopify
staff set it out in the developer forum on September 2, 2026: completion needs
"both (1) the checkout permission on your client's token, and (2) the merchant
having your agent's channel enabled on their shop," and "the merchant side isn't
a toggle a merchant can flip for an arbitrary agent. It's tied to the agent
being onboarded for native checkout." The first gate has no public route:
"granted on a case by case basis and there isn't a public application or waitlist
for self-serve platforms," absent from dashboard credentials, and not addable
from the scope picker. A developer in the same thread confirmed it from the
outside — requesting `dev.ucp.shopping.checkout:manage` returns `access_denied`
for an unapproved client while an invented scope returns `invalid_scope`, so the
scope is real and switched on per client while being invisible in the dashboard.

This is the readiness doc's Path B with Shopify in the gatekeeper's seat, and the
clearest evidence yet for that doc's predicted access order: discovery opened to
an app our size self-serve, purchasing did not. Three named companies have been
blocked on it since early August, one of them already placing Shopify orders
through browser automation and asking to graduate.

The existing reasoning applies on top of that: completing a purchase on our
say-so is where responsibility for the choice stops being shared, and Stripe's
Agent Services terms show how the written allocation lands on the agent
developer.

The point of this integration is a better click-out, not a step toward autonomy.

## The flow, mapped to what we run now

Today:

1. A provider web-search tool returns candidate pages; the model picks among
   them and emits the product URL with its suggestion.
2. `checkProductLink` fetches that page; the Shopify reader pulls
   `/products/<handle>.js` for price, variants, availability.
3. Dead or sold out is retired and the slot refilled; price drift over 15% is
   corrected.
4. The notification-day recheck repeats step 2 against the visible cards.
5. The user taps View Product, opens the retailer in a browser, and we log the
   domain to `outbound_clicks`.

With the catalog:

1. The model produces a **description of the right gift** — what the CIS is
   actually for.
2. `search_catalog` turns that into candidates across every Shopify merchant,
   already filtered to in-stock and ships-to-them, returned as structured data
   rather than as pages to be scraped.
3. The model chooses among them. It is doing the same job as today, on better
   evidence: facts the merchant published rather than whatever we could parse
   out of a page that may not have let us in.
4. `get_product` resolves the variant — the size, the color — from what we know
   about the recipient, and returns a checkout link for that exact variant.
5. The user taps through to a correct product page with the right SKU selected.

The change is not that discovery starts working; web search already finds real
products. It is that steps 2–4 of the current flow collapse into step 2 of the
new one. Price, stock and variant arrive as data instead of being reconstructed
from HTML, so the third of cards we currently can't confirm mostly stops
existing — over the Shopify share. The existing link-check does not go away: it
still covers the clicks that land elsewhere, and it stays the fallback when the
catalog returns nothing good. This is additive.

The genuinely new capability is variant resolution. A search result is a page;
`get_product` resolves a size and color to a specific in-stock variant. It is
not a full grid: it returns the variants matching the options you pass in, each
with its own stock flag and cart link, and marks every other option value
available or not relative to that selection. Enough to answer "is the 4–5 in
stock, and in which colors," which is the sizing question the readiness doc
keeps flagging.

For a single-item gift, Cart and Checkout MCP may not be needed at all:
`get_product` already yields a variant-level seller checkout link. Cart building
earns its place only if we ever bundle.

## Affiliate revenue, and the trap in it

Promoted placements extend the Global Catalog with a paid-placement flow: 0.3%
base commission on attributed purchases, last-click, 7-day window, applied to
every item in the attributed order rather than only the clicked product.
Merchants can add more on top. It requires the developer dashboard and is
invite-led during a Developer Preview, so it is not available on day one.

This is the first credible answer to step 1 of "What we do now" — wiring up
affiliate revenue — because it covers 57% of our outbound clicks through one
integration instead of per-retailer network deals.

The trap is obvious: paid placement distorts the pick, and editorial
independence is a real part of what we are selling. The documentation suggests a
configuration that avoids it. Promoted variants are identifiable by a
`placement` object, organic variants omit it, and — the important part — "in an
authorized response, all variant URLs include `shclid` and `shcgid` attribution
parameters, whether the variant is promoted or organic." So attribution and
commission are available on products chosen purely on merit. Whether blending
can be switched off is "server-managed configuration" and not something the docs
let us confirm from outside.

The rule to hold if we go near this: take the commission on a product we would
have picked anyway; never let `placement` touch the ranking. Disclosure is
required where a material connection exists, and Shopify's own guidance says to
label promoted results and not bury the disclosure.

## What the probe found

Run against the live Global Catalog on September 22, 2026, anonymous tier, no
credential, using Shopify's published test profile fixture. The sample was 40
real current suggestions — their actual titles, prices and retailer domains.

| result                                           | count | share |
| ------------------------------------------------ | ----: | ----: |
| found on the brand's own store, price within 10% |    14 |   35% |
| found on the brand's own store, different price  |     5 |   13% |
| found only through a marketplace reseller        |    17 |   43% |
| not found at a usable match                      |     4 |   10% |

**The characterful long tail is there.** Lumio's Lito Limited Edition at exactly
$200, Onggi's matte black fermentation crock at $195, Imaginary Authors' A Whiff
of Waffle Cone at $115, Artifact Puzzles' Ecru wooden jigsaw at $50, Two Gether
Studios' Illimat gift set at $57.95 — each from the brand's own store, each
matching the price we had already published. The worry that the index would only
hold mass-market goods is not borne out. Three of the four misses are Uncommon
Goods exclusives, and Uncommon Goods does not run on Shopify, so their absence
is correct rather than a gap.

Every matched variant carried an availability flag and a variant-level
`checkout_url`.

**Reseller noise is the real constraint.** For 43% of the sample the only match
was a marketplace seller rather than the brand, and those listings are often not
the same product at all: a $25 listing against our $199 set, $289.95 against our
$124.95, a $29.99 keychain matched to a $125 framed print. Dropped into the
pipeline unfiltered, catalog results would make recommendations _worse_ than
what we ship today.

The mitigation is available. Seller identity comes back on every variant, so the
existing editorial preference — brand sites first, specialty shops next — is
expressible as a filter rather than lost to Shopify's relevance order. That
turns the doc's standing worry about ranking into a solved problem, provided we
actually do it.

**What this test does not show.** It asks the catalog to find products we had
already chosen by web search, which is backwards from how we would use it. Real
retrieval would search by intent and let the model choose among candidates.
Spot-checking that direction — "a gift for someone who ferments vegetables at
home" — returned a coherent set of fermentation kits from several merchants, but
judging whether those picks are _good_ needs a person, not a string comparison.
So read 35% as a floor on a deliberately unfavourable test, not as a hit rate.

## What the September 23 spikes found

Both spikes ran against the live catalog at the anonymous tier with Shopify's
test profile fixture.

**The catalog as the way we find gifts: ruled out.** Fifteen real recipients
went through the production prompt and model (`gpt-5.6-sol`, prompt v18) with
the catalog as the only retrieval tool, once restricted to brand stores and
once to brand stores plus specialty retailers. Every run returned three gifts,
including brand-only runs where 12% of searches left fewer than three
candidates; the model searched more and chose among what was there. That is
the problem. When catalog picks are worse, nothing signals it, so there is no
point where code could fall back to web search, and giving the model both
tools at once is a mixed pool rather than a fallback. The runs were also
slower: 77–94 seconds median against 49 for the web-search runs they were
compared with.

**The catalog as a way to confirm what web search found: almost nothing to
confirm.** `be-gifted/scripts/probe-catalog.ts` ran the existing link check
and a same-store catalog lookup side by side over 378 recent suggestion links
(45 days, at most three per store):

| link check today | links | on Shopify | catalog confirms |
| ---------------- | ----: | ---------: | ---------------: |
| readable         |   275 |        206 |              144 |
| blocked          |    54 |          5 |                4 |
| unreadable       |    33 |          6 |                0 |
| unknown          |    12 |          4 |                0 |
| dead             |     4 |          2 |                0 |

The links we cannot confirm are not a Shopify problem. Of the 99 the link
check cannot read, 15 are known Shopify stores, 40 are known not to be, and 44
could not be classified because their homepages block us as well — among them
Target, Walmart, Best Buy, REI, Williams-Sonoma, Crate & Barrel and B&H. The
classification is not what the verdict rests on: the catalog was queried for
every link, and for all 84 gap links outside the known Shopify set it found
nothing on the same store, against a same-store find for 85% of links we know
are Shopify because we read their product JSON. Four of the 15 Shopify gap
links are not product pages at all. Shopify stores are already readable — 193
of the 206 readable Shopify links came through the storefront product JSON
reader — so the catalog would confirm 4 links the check misses today (6
counting two same-product matches under a different handle), about 1–2% of
the sample. The sample takes at most three links per store, which
under-weights the large retailers, so the true share of what we ship is if
anything lower.

Where both sources read the same product (144 links), the page price fell
inside the catalog's price range 136 times. Stock disagreed on 6, but the
probe compared a single catalog variant against the link check's product-level
reading, so those are not evidence either way. Matching was workable — the
same-store lookup found the exact product handle for 148 of 223 Shopify links —
and the anonymous tier answered 62 of about 444 requests (14%) with a 429 at
four concurrent requests,
which a daily cron would have to design around.

**Verdict: drop.** The link-confirmation gap is real, but it sits with large
non-Shopify retailers, and nothing in this document reaches them.
Reproduce with `node scripts/probe-catalog.ts` in `be-gifted`.

## What to settle before building

- ~~Does the catalog carry the kind of gifts we recommend?~~ **Tested — yes,
  with a caveat that becomes the main design constraint.** See "What the probe
  found" above.
- **Which agreement governs a UCP agent.** Checked again on September 22, 2026
  across the whole agent documentation set, the quickstart, the catalog
  extension reference and the CLI repository (MIT licensed): not one reference
  to terms of use, acceptable use, or any agreement. The API License and Terms
  of Use is the nearest candidate and is written for apps a merchant installs,
  which is not what a catalog client is. Whether it binds us is a lawyer's
  question, and worth asking before we ship on this rather than before we test
  on it.
- **Whether the training restriction reaches the CIS.** If those terms do apply,
  they forbid using merchant data "including any anonymous, aggregate, or
  derived forms of data" to train, fine-tune or improve any model without
  consent. Reading catalog results to choose a gift is plainly fine. Whether
  outcome data — what landed, what was returned — learned against
  catalog-sourced products counts as derived merchant data is not obvious, and
  it points straight at the asset the readiness doc says we are building.
- **What actually earns a checkout-completion grant.** Shopify gives no criteria
  and runs no application. The only agent publicly known to hold it is Meta's,
  which points at scale or a commercial relationship rather than a bar a small
  app can clear. Worth re-checking Shopify's changelog, which staff said is where
  any change would be announced.
- **Real rate limits at the anonymous tier**, which are published only as
  "lowest." Our daily generation cron is the load that has to fit.
- **Whether promoted-placement blending can be disabled** while keeping
  attribution.
- **What happens to our ranking.** The suggestion prompt deliberately ranks
  brand sites first, specialty shops second, big-box last. A catalog search
  returns what Shopify's index returns. Keeping our editorial order on top of
  their relevance order is a design problem, not a configuration setting.

## Sources

All read from primary documentation, September 22, 2026.

- [Build commerce agents with UCP](https://shopify.dev/docs/agents) — the
  four-stage flow.
- [Auth and rate limiting](https://shopify.dev/docs/agents/profiles/auth-and-rate-limiting)
  — the three tiers and the capability matrix.
- [Agent profiles and UCP negotiation](https://shopify.dev/docs/agents/profiles)
  — self-hosted profile JSON, capability intersection.
- [Global Catalog MCP](https://shopify.dev/docs/agents/catalog/global-catalog) —
  `search_catalog`, `lookup_catalog`, `get_product`, filters, inferred fields.
- [Cart MCP](https://shopify.dev/docs/agents/carts-and-checkout/cart-mcp) and
  [Checkout MCP](https://shopify.dev/docs/agents/carts-and-checkout/checkout-mcp)
  — `continue_url` handoff, `complete_checkout`, escalation states.
- [Earn with promoted placements](https://shopify.dev/docs/agents/catalog/promoted-placement)
  — commission, attribution parameters, disclosure.
- [UCP specification](https://ucp.dev/2026-08-25/specification/overview/).
- [Shopify API License and Terms of Use](https://www.shopify.com/legal/api-terms)
  — the $100 liability cap, the developer indemnity, the model-training
  restriction.
