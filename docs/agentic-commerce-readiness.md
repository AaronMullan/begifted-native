# BeGifted — Agentic Commerce: Potential Futures

**The idea:** be the best gifting advisor we can today, and stay ready in case delivering gifts automatically becomes possible. This doc maps the realistic paths by which automated gifting could arrive, what has to be true for each, and how we stay ready without betting the company on any one outcome — including the bad outcomes. Method: review of our own code plus market and vendor research, independently verified.

## Where this could go

BeGifted is an **app** — an AI gifting advisor — not an agent and not a store. The business is a **subscription**: people pay us to be good at gifts ("never think about gifts again"). The capability that could arrive is the **Extended Version**: autonomous gifting ("it's Mom's birthday — we bought and shipped a gift within your $75 budget"), done by plugging into purchasing capability someone else provides.

That service doesn't exist yet for an app our size, so today's work is getting ready: keep two rules permanently true, and watch the ways the capability could reach us. Meanwhile the thing that grows in value is the **CIS** (Creative Intelligence Stack) — who the recipient is, their tastes, the occasions, what's been given, what landed. The CIS is the part that knows how to _pick_ a good gift; placing the order is a separate part we intend to rent.

The two permanent rules:

- **Never the seller / merchant of record.** We don't hold money, inventory, or shipping risk.
- **Never the registered agent.** In these protocols, "agent" means a legally accountable identity (explained below). We rent one — never become one.

Things we've already decided against: building checkout ourselves (breaks both rules, and would be obsolete the day a real service ships); the vendors that fight retailers' bot defenses (a losing arms race); and taking the money and buying on our own account, like Throne does (it works, but it makes you an operations company — we're a small team on purpose). Not revisiting those here.

## What the business is

We use AI for our own work; we don't sell agent services to anyone. In everything below, we are a **buyer of checkout capability**, never a seller of it. Selling it means becoming the registered agent — usually the merchant of record too — which is a payments-and-compliance company. We rent the plumbing so we never have to be plumbers.

**The company stands or falls on the subscription.** Affiliate links earn money on clicks; transaction fees earn money on purchases; a subscription earns money on _judgment_ — the part that's actually ours. If users won't pay for gifting judgment, we don't pivot — we stop. Everything in this doc assumes that bet pays off. The judgment is a paid product whether or not we can transact; automated purchasing is a feature we could add to a working subscription later. What follows from that:

1. Purchasing capability is **a cost of a feature, not a source of revenue.** We need checkout to be cheap, reliable, and boring — we don't need to profit on it.
2. Subscription revenue pays for the customer-support work that touching purchases creates.
3. Affiliate revenue is for now, not forever. (And it isn't live yet: only the click-out and click logging exist; the affiliate wiring still has to be built — step 1 below.)

One wrinkle: Apple's in-app-purchase rules don't apply to the gifts themselves (physical goods, normal payment rails — no 30% cut). But the BeGifted **subscription is a digital good**: Apple takes 15–30% (15% at our size; US apps can currently send users to web checkout with 0% Apple commission after the _Epic_ ruling, though Apple is asking the Supreme Court to review — conference June 25, 2026).

## Where we are today

The model is **BeGifted suggests, the retailer sells**: "View Product" opens the retailer's page in a browser; we log the tap (it tells us interest, not whether they bought); the link is AI-generated — any product, any retailer.

AI-generated links aren't guaranteed to point at a live, in-stock product, so any purchasing future needs **product resolution** — turning a suggestion into a specific item that can actually be bought. We already check links at generation time — dead ones are dropped and replaced — but only on the daily path, and only for "is the page up," not stock, variant, or price. A purchase needs the same check at charge time, and a catalog to fall back on when the check fails — not another guessed URL.

What makes a sale possible for an agent isn't payment — money moves on ordinary card rails. It's the merchant being **machine-shoppable**: publishing a product feed, offering a checkout the agent can call, and letting the agent in instead of blocking it as a bot. That can happen two ways, and we prepare for both: the **merchant** turns it on directly, or their **platform or payment processor** turns it on for everyone at once. Cooperative checkout — the only kind compatible with our rules — works wherever either has happened. A live link to a shop where neither has happened still can't be auto-purchased. "Point the AI at catalogs we can transact against" means exactly this.

**Sizes and variants make resolution harder.** A sweater isn't one product — it's a size × color × fit grid, and buying the wrong cell means a returned gift. No agent can guess what size to buy a six-year-old; only someone who knows the kid can. So:

- The **recipient data is the real asset**: sizes, fit, style, allergies, "already owns" are what turn a suggestion into the right item. The CIS has to collect them on purpose.
- Early autonomy would cover gifts where sizing can't go wrong — experiences, gift cards, consumables, one-size items, things that are easy to return. Clothes and shoes wait until we know enough.

**The suggestion engine already points the right way.** The live prompt ranks brand sites first, then specialty shops, big-box last — and small brand shops mostly run on Shopify, which is where cooperative checkout is arriving first. The catch, under Path B below: a gatekeeper's covered merchants are the big ones, which our ranking puts last.

## The capability we're watching

Two steps exist for us: the **click-out** (live) and — behind one gate, cooperative checkout becoming available to an app our size — **buying on the user's behalf**. Past the gate, one integration covers everything: every payment rail works on per-purchase tokens (one merchant, one cart, one amount), and standing instructions — what the AP2 protocol calls Intent Mandates — turn one-at-a-time approved buying into autonomy. The only question after that would be **how wide the mandate gets** — which recipients, which occasions fire automatically, what the budget cap is, when the app should stop and ask. Full discretion with no mandate at all is a place we never go: the mandate is how the user stays in control, not a speed bump.

"Approve each purchase" would be the natural first version, and the fallback when the app isn't sure; the mandate is how it would widen from there — as far as users want it to, and no further.

**Who answers for what.** The moment a purchase happens on our say-so, we own the result. That splits in two, and the halves move in opposite directions:

- **Answering for the transaction** (declined cards, fraud, chargebacks, refunds, wrong item, late delivery, returns) — this **should shrink**, but that's a prediction, not a fact. The payment rails are taking over the machinery — the retailer stays the seller and handles shipping and returns; the network runs the dispute process — but nobody has agreed to absorb the losses: under every current protocol the merchant still eats fraud and chargebacks, as OpenAI's own ACP docs state. Nobody has published numbers on how often agent purchases get disputed. That's fine for us (we're not the merchant either), but it gives merchants a standing reason to keep agents out — which slows signal 2.
- **Answering for the choice** (wrong gift, something they already had) — this **grows** with autonomy and can't be handed to anyone, because it _is_ the product.

Two things make the choice the thing to be careful with. It's lopsided: one bad autonomous gift does damage that dozens of good ones don't undo. And blame finds the platform: Uber and Airbnb both argued "we're just a marketplace," and courts, users, and regulators put the responsibility on them anyway. The line that protects us is the **mandate**: as long as the user authorized the choice — approved the purchase, or signed a standing instruction like "auto-gift Mom within $75" — responsibility is shared. With no mandate, the choice is entirely ours. That's the line we move toward slowly, and the reason the CIS should be built around explicit, revocable mandates from day one.

### What "autonomy" actually means here

If we have to know size, fit, and color before buying, what's left of "autonomous"? **The app is autonomous about the decision and the calendar, not the facts.** The burdens it would remove are remembering the occasion, choosing the gift, and placing the order — not knowing a shoe size, which, once learned, stays known.

Sizes and preferences belong to the relationship, not the purchase — and collecting them is the hard part. Nobody fills out a size-fit-allergies form to add their dad, and half of it they don't know offhand. The profile has to build up gradually: pulled from conversation, asked when an occasion makes the question natural ("Leo's birthday is in three weeks — still a size 7?"), asked only when the gift category needs it, filled in from results. Coverage would widen as the profile fills: simple gifts could be autonomous on day one; clothes would unlock when the data is there; every fact learned is used forever after. Designing this collection well is a hard product problem, not a setup detail (step 2 below).

So "stop and ask" becomes the exception, used when the app isn't sure — a brand-new recipient, an old measurement (kids grow), a sizing-heavy gift without the data. When something's missing, the app **asks instead of guessing**.

## What an "agent" actually is — and why we'll never be one

Strip away the AI marketing and the "agent" in every one of these protocols does three things: it holds the conversation where the user says what to buy and approves it; it signs its requests against a registry so merchants and networks know who's knocking; and it presents the token that lets the merchant charge the user. That bundle isn't software — it's a **named, registered party that can be audited, sued, or cut off.** Anyone can write the code; almost nobody is worth a network formally vouching for. That's why the seat is expensive and why few hold it.

What gets called a "shopping agent" today:

- **The big assistants** (ChatGPT, Copilot, Gemini coming) — registered, protocol-native. The only ones actually in the cooperative seat.
- **Agentic browsers** (Comet, Atlas, Gemini-in-Chrome) — act inside the user's own logged-in session. _Amazon v. Perplexity_ is deciding whether that's legal, and it's genuinely undecided (the appeals court froze the injunction within a week).
- **Retailers' own agents** (Amazon Buy for Me, Walmart Sparky) — agent and store are the same company. Competition, not infrastructure.
- **The gray vendors** (Zinc, Rye) — pre-protocol bots running managed buyer accounts. The adversarial lane.
- **Big-company pilots** — one-off deals between networks and large firms. Not open to us.

The cooperative seat holds nothing but the big assistants — and we don't want it anyway. **Our seat is buying checkout through a sponsor who holds the registered seat.** The question is who that sponsor turns out to be, and on what terms.

## How the capability could reach us — two realistic paths

**Path A — a neutral sponsor (open rails).** A payments company the size of Stripe offers "buy this for my user" as an API anyone can sign up for. They hold the registered seat and the user's card; at purchase time the network issues a token good for one merchant, one cart, one amount; the merchant charges it and remains the seller. We never hold anything chargeable, and the sponsor can cut us off instantly. This already happened once: the card networks never trusted small merchants either, until Stripe automated the vetting and made a business of the little guys. And an app is easier to vouch for than a merchant — a merchant can take money and not ship; an app never touches money.

**Path B — a flagship gatekeeper (the most likely case).** Checkout is available only through a big assistant's API — ChatGPT, Gemini, Copilot — for their cut, under their rules. The App Store again: one company owns the doorway, can change the terms, and can build gifting itself the day it looks worth building.

**Why B is more likely than A.** "Small customers are a real business" was true in payments because the only scarce thing was vetting. Here the scarce seat bundles three things — the registered identity, the users, and the users' trust — and only the big assistants have all three. A payments company can do the vetting but can't bring the users. So the most natural seller of "buy for my user" is whoever already has the user, and they'd rather keep the margin than share it with small apps. The merchant side points the same way: whatever merchants will pay for customers who are ready to buy (an open question — OpenAI's 4% Shopify fee lasted about six weeks before dying with Instant Checkout), it goes to whoever owns the doorway. "Merchants want our customers" only pays us if we own the doorway, and under B we don't.

**Under a gatekeeper, our suggestions get restricted — and the best ones first.** Only what's on the gatekeeper's merchant list can be auto-purchased, and those lists start with the giants — Walmart, Target, the big brands — because that's who gatekeepers sign first. Our rankings run the other way, so **our most distinctive suggestions would be the least buyable.** Both ways out are bad: limit suggestions to what's purchasable and we become ChatGPT shopping with extra steps, while our learning data drifts toward big-box gifts — exactly what a flagship could copy; keep suggesting the best gifts and "it's handled" fails precisely on the most thoughtful ones. Instant Checkout showed how short these lists run: a dozen to ~30 Shopify merchants ever went live, out of millions. One mitigating possibility: if payment processors start switching on agent access for all their merchants at once (signal 2), small shops could become purchasable even under a gatekeeper. So when a gatekeeper offers terms, check the merchant coverage and the fee separately.

**What this means now:** don't build assuming Path A. Keep the click-out working well — under B it's both our bargaining chip and how we deliver the gifts the merchant list doesn't cover. Keep the purchasing integration small so a sponsor can be swapped. And when a service appears, the first question isn't "can we transact?" — it's "can we transact without giving a gatekeeper a veto over our business?"

### The payment rails underneath (either path)

Four protocols, one shared trait: **the user's own card pays the merchant directly; the agent never touches the money and is never the seller.**

- **ACP (OpenAI + Stripe).** A Stripe token limited to one merchant and cart; the merchant stays the seller. Open standard (PayPal is building support for 2026). Shipped as **ChatGPT Instant Checkout** (Sept 2025); **pulled back March 2026**: a dozen (The Information) to ~30 (Shopify's number) merchants ever went live against "1M+ coming soon" marketing; Walmart said in-chat purchases converted at a third the rate of its click-outs (its own measurement, on a limited catalog, blamed on the one-item-at-a-time checkout); the 4% merchant fee died with the product. OpenAI fell back to merchant-run checkout — then within three months came back via retailer apps inside ChatGPT and the Visa deal below. A retreat and regroup, not an exit. What failed is OpenAI-owned checkout at a meaningful fee — which supports our bet that checkout ends up cheap.
- **AP2 (Google and others).** Works with any payment method; its contribution is signed, tamper-proof **Mandates** recording what the user authorized. Announced; early.
- **Visa Intelligent Commerce.** A Visa token tied to a specific agent, with network-level spending controls. The furthest along: **Intelligent Commerce Connect** (April 2026) is a deliberately neutral on-ramp for "agent builders, merchants, and enablers," accepting several competing protocols through one integration — big-company pilots now, wider "across 2026." On June 10, 2026 Visa announced a deal with **OpenAI**: single-use tokens tied to agent and purpose, spending caps, required approvals, Visa "handling" fraud monitoring, chargebacks, and refunds. "Handling" means running the machinery, not absorbing the losses — there's no liability shift in the announcement, and the merchant still eats disputes. Nothing here is open to an app our size yet (signal 1).
- **Mastercard Agent Pay.** Cards enrolled through the issuing bank (Citi and US Bank first); tokens tied to agent, merchant, and the user's standing permission. Rolling out through certified processors in 2026.

**"Not the merchant" ≠ "not accountable."** All four make the agent answerable for faithfully doing what the user asked, and none says yet how blame splits between agent and network when something goes wrong. Until that's written down, the old card rules apply: the merchant eats it. And the tamper-proof record of what the user authorized is exactly the evidence that gets used against the agent side. Renting a sponsor's registered seat shrinks our legal exposure; answering for the gift choice stays ours either way.

### Still our problem, even with the service

- **Product resolution** — suggestion → live, correct, in-stock item, from merchants we can actually buy from.
- **The choice** — and answering for it.

## The market right now (June 2026)

**Who can transact today: the big assistants, nobody else.** Instant Checkout came and went (above). Still running: **Microsoft Copilot Checkout** (US; Shopify, PayPal, Stripe, Etsy). **Google's UCP** (announced Jan 2026; Walmart, Target, Visa, Mastercard, and Stripe on board) is coming to Search and Gemini — the "integrate once, sell through every assistant" pitch is Shopify's marketing, not a guarantee; OpenAI isn't part of UCP. Merchants can now sign themselves up (Stripe's Agentic Commerce Suite, spreading through Wix, WooCommerce, BigCommerce, Squarespace). Apps cannot: Stripe's buyer-side API is invitation-only, assistants choose which agents to allow, and we found no small app anywhere actually transacting through ACP. Merchants getting self-serve before apps do is exactly the order we predicted — and a point for Path B.

**Both sides have to opt in.** The payment part already works everywhere cards do; what's opt-in is the merchant letting the agent in rather than blocking it as a bot. The networks are pushing that switch down to the companies merchants already sit behind — the CDNs and payment processors — where it can be flipped for thousands of shops at once. If the big ones flip it by default, the small-shop world opens fast.

**Amazon is the holdout — but shifting.** It sued Perplexity (Nov 2025) and won an injunction (Mar 2026), now frozen on appeal. It blocks outside agents, including ChatGPT, pushes its own (**Alexa for Shopping**), and has joined no protocol. But: AWS now sells Visa's agent-payment tech; a ~40-person Amazon team is building APIs to connect the store to outside agents, including ChatGPT; CEO Andy Jassy says they'll "find ways to partner"; Amazon put $50B into OpenAI. **"Buy any gift anywhere" currently has an Amazon-shaped hole.** If it closes, it will close through one-on-one deals with flagships — more evidence for Path B. Our engine already uses Amazon as a last resort, so the hole hurts us less than it would most apps.

**The bot route is a dead end, not a head start.** Rye and Zinc buy from retailers who haven't agreed to it: browser automation, managed accounts, proxies to dodge fraud detection — Rye's own blog has a post called "The Fraud Wall." Rye claims 120k+ orders a month and names customers (Throne, Thnks, Bilt), but every number is its own marketing: no funding since 2022, abandoned public SDK. We can't check any of it from outside — and that's the problem. Not building on this. One correction from fact-checking: **Violet doesn't belong in this bin** — it integrates with platforms openly, with permission (Klarna led its funding; it publishes against scraping). The closest existing thing to the Path A service. On the watch list (signal 1).

**Throne — the road not taken.** Fans pay Throne; Throne buys and ships, keeping both sides' addresses hidden. It works — profitable, a million-plus creators, 4.7 on Trustpilot — and it is a hand-operated storefront on top of Amazon Business, with everything being the seller entails: an address leak, frozen payouts during fraud reviews, wrong items, late deliveries. That's the company we decided not to be. Useful as a preview of what touching transactions costs.

## Who gets access, in what order

The order is predictable: **big assistants and big merchants first** (happening now), **small merchants second** (when processors flip the switch), **apps like us last — if ever** (future C is the line stopping before it reaches us). If it does reach us, the merchants will already be on board — we plug in the way a new store plugged into Stripe in 2015, no convincing anyone. The flip side: whenever we get access, so does every other app, and the assistants will have had years of head start on shopping itself. **Being able to transact will be something everyone has. Knowing the recipient well is what won't be.**

## The fourth future: a flagship builds gifting itself

One threat needs no payment rails at all: **ChatGPT (or Gemini, or Copilot) ships gifting as a feature.** "Buy my mom a birthday gift, under $75" is a prompt, not a product roadmap, and ChatGPT already has the parts: memory of what users say about their families, a shopping surface, and — through the Visa deal — payments coming back. This can happen under any of the paths, and it attacks the part we're counting on: the judgment.

Why it might happen: they already have the users, and free-and-good-enough beats paid-and-better for most people. Our judgment partly runs on their models — what's ours is the data and the product around the model, never the intelligence itself. And the platforms have a history of absorbing apps that are thin layers over their models.

Why it might not, or not completely:

- **Chat memory is not a recipient profile.** It holds whatever happened to come up. Ours holds what we deliberately asked, confirmed, and corrected against results — which is exactly what buying the right size requires.
- **Assistants answer; they don't initiate.** "Mom's birthday is in three weeks" has to come from the app, unprompted. Today no assistant does calendar-driven, many-recipient gifting. That's a feature gap, not a law of nature — signal 4 watches it.
- **Outcome data is a race we haven't started.** We don't record outcomes yet (step 2), and a flagship with checkout sees orders and returns automatically. What it can't see is whether the gift _landed_ — that's solicited data, and it goes to whoever builds collection for it first.

If this happens, what saves us is one question: **how much of our recipient data could a chat log reproduce?** It defends only where the data is structured, built over time, and corrected by results. That sets the bar for step 2 below — and the deadline: the time when a dedicated advisor clearly beats an assistant's incidental memory is now, before assistants learn to start the conversation.

## The four futures, side by side

A, B, and C differ on one question: does purchasing capability reach an app our size, and on whose terms. D needs no rails and can land on top of any of them. All four assume people pay for the subscription.

- **A — Open rails.** A neutral sponsor sells checkout to anyone; it's cheap and boring. Everything works as designed.
- **B — Gatekeeper.** A flagship's API only. The feature ships, but suggestions get restricted (above): the generic picks become buyable first, the best picks last. The click-out delivers the rest; being able to swap sponsors is the other protection.
- **C — No access.** One-on-one deals stay the norm; nothing reaches our size. Automated gifting never ships, and the business was built to survive that: subscription plus click-out carry it, and we deliberately spent almost nothing preparing.
- **D — Absorption.** A flagship builds gifting itself. The question stops being "is our judgment good?" and becomes "is it enough better than the free assistant to pay for?" The click-out gives us no bargaining power here — nothing flows through us. The defense is being deeper and faster: recipient data a chat log can't reproduce, collected before the assistants learn to initiate.

## The fifth future: assistants as distribution

The assistants are also surfaces vertical apps plug into — ChatGPT apps, Claude connectors, Gemini integrations, all MCP, all live; Etsy shipped a gifting app in May 2026. Not a build for us: connectors get no proactive channel, so they can advertise the subscription but never demonstrate it — and the reactive half is where free assistants are closest to good-enough. Staying ready costs nothing: the CIS already runs server-side; keep it that way (signal 5).

## What we're watching

(1 tells A, B, and C apart; 2 tells us how fast things open; 3 controls how wide the mandate can get; 4 is the early warning for D; 5 watches the fifth future.)

1. **Checkout an app our size can actually sign up for — and on what terms.** When it appears, which kind: a neutral payments company (A) or a flagship's API (B)? Check the cost (must be absorbable as a feature cost) and the terms (no veto over our business). Today it doesn't exist, and the early signs point to B. _June 2026:_ Path A finally has a real candidate — **Visa Intelligent Commerce Connect**, openly courting "agent builders" — but it's big-company pilots only, and its headline deal went to a flagship (OpenAI). Watch whether it, or anyone (including **Violet**), opens sign-ups to small apps.
2. **Enough of the right merchants accepting agents — measured against where we actually send people.** Merchant counts can look big while covering none of the shops we suggest. The real number: **what fraction of our outbound clicks go to merchants an agent could buy from?** We already record which retailer every click goes to (DEV-151); cross that against the published coverage lists and we have a readiness percentage instead of a feeling. The shape matters too: coverage spreading from small shops upward = A; from the giants downward, then stalling = B. The fastest-moving signal. Compute it both ways — as-ranked (our readiness) and coverage-weighted by category (the market's shape; our ranking suppresses the first number by design). Quarterly. Above ~30% as-ranked: start step 6's scouting.
3. **Someone finally writes down who's liable.** Every protocol leaves agent-vs-network blame unassigned (today's default: the merchant eats it). The wider we let mandates get, the more this matters — widening autonomy waits on this, not on technology. The slowest signal, and the one that decides.
4. **An assistant starts doing gifting on its own.** The warning sign for D. Today they answer when asked. Watch for them starting the conversation — "Mother's Day is in two weeks — want ideas for your mom?" — recipient profiles, a gifting section. Unlike the other three, this isn't a door opening; it's the window closing.
5. **An assistant surface offering terms worth having.** A proactive channel for third-party apps, monetization that allows requiring our own subscription, or written data-retention terms for connector conversations. Any one upgrades the fifth future from watch to decision.

Already happened, with an asterisk: the cooperative rail was built (Instant Checkout), pulled back, and partly rebuilt. So flagships can do this, and they keep coming back to it. Not yet: a flagship making a meaningful fee stick, or any of it reaching an app our size. Also pending: _Amazon v. Perplexity_, which decides whether "anywhere" can ever include Amazon.

## What we do now

1. **Ship the product — and actually wire up affiliate revenue.** Click logging records the taps, but no affiliate money flows: there's no link rewriting and no network integration. Building that turns the click-out into revenue with nothing to ship, and tells us how often suggestions lead to purchases — which is also the test of whether users want us closer to the purchase.
2. **Collect recipient data on purpose.** Tastes, occasions, budgets — plus the facts that pick the right item: measurements, fit, allergies, "already owns." The hard part is collecting it without a form nobody fills out: through conversation, through occasion-timed questions, from how gifts turn out. Record outcomes too — good, returned, duplicate — because nothing improves suggestions or would earn autonomy like results, and we don't record them yet. Build all of it around explicit, revocable mandates from the start.
3. **Build no checkout.** No vendor integration, no stored cards. Anything we build now is obsolete the day the real service ships. Keep the purchase integration small enough to swap sponsors cheaply.
4. **Raise link quality to advisor grade.** Extend the check beyond "is the page up" to stock, price, and variants; add the catalog fallback. It's the buildable half of resolution and it improves the product today.
5. **Treat the click-out as a way we deliver, not a fallback.** Never end up with one vendor and no alternative. Under a gatekeeper, "we found it, it ships in time, tap to buy" is how the best picks reach the user — with auto-purchase added where coverage allows.
6. **When a service appears, pilot like a skeptic — terms before technology.** Ask for reference customers our size, run real orders and measure the failures ourselves, ask who eats chargebacks, treat privacy, returns, and fraud as product features from day one — Throne's scars are the reading list. If the only door is a gatekeeper's, weigh the gatekeeper as carefully as the feature.

The summary: we sell gifting judgment by subscription, we'd rent purchasing if it can ever be rented on terms that don't endanger the business, and we never become a store.

## What we couldn't verify

- Throne's internals: the Amazon-vs-aggregator split, which vendor it uses (Rye and Violet both claim it), post-2024 figures.
- How reliable any of the bot vendors are at real volume (would take a pilot to know).
- Who's liable under the agent rails — all unwritten; "the merchant eats it" is the current default, not a permanent fact.
- Any number for how often agent purchases get disputed. A "~2.4×" figure circulating in vendor content traces to a TrustSphere.ai blog post with no data behind it, citing regulatory documents that don't exist; an earlier draft of this doc repeated it — removed in the June 11, 2026 fact-check pass.
- How fast processors will switch on agent access for their merchants.
- ACP merchant coverage — partly answered the hard way: a dozen to ~30 Shopify merchants live before the pullback. The Walmart conversion number is on record but self-reported and not a controlled comparison.
- Rye's claimed volume — its own marketing, nothing independent.
- The exact date and terms of the $50B Amazon–OpenAI investment (press accounts conflict).
- **Which path the service takes.** A neutral-sponsor offering is our guess from how card networks have absorbed small players before, not an announced product. Early evidence leans B.
- The _Amazon v. Perplexity_ outcome (appeal pending as of June 2026).

## Sources

- Current model: review of the app's click-out and click logging, the gift-generation pipeline's URL checking (drop-and-replace; daily generation path only), and the live retailer rules in the active system prompt ("Gift Protocol v2.6.4"), which prefers brand-direct → specialty → major retailer → marketplace and excludes Etsy and non-US storefronts.
- Aggregators: Rye <https://rye.com/> ([whitepaper](https://rye.com/blog/whitepaper-universal-checkout-agentic-commerce), [fraud wall](https://rye.com/blog/fraud-detection-agentic-commerce), [anti-protocol position](https://rye.com/blog/introducing-the-protocol), [Crunchbase](https://www.crunchbase.com/organization/rye)); Zinc <https://www.zinc.io/> ([Abunda case study](https://www.zinc.io/cases/abunda/), [docs](https://docs.zincapi.com/)); Violet <https://violet.io/> ([Throne case study](https://violet.io/case-study/throne)) — reclassified cooperative after the June 2026 fact-check pass.
- Throne: [TechCrunch — returned investor money](https://techcrunch.com/2024/03/08/creator-wishlist-startup-throne-is-doing-so-well-that-it-returned-investor-money/), [Amazon Business customer story](https://business.amazon.com/en/customer-stories/throne), [Trustpilot](https://www.trustpilot.com/review/throne.com), [CyberGhost — address-exposure bug](https://www.cyberghostvpn.com/privacyhub/throne-bug-exposes-addresses/), [TechCrunch Apr 2023 — the actual breach date](https://techcrunch.com/2023/04/06/throne-security-bug-creators-address/).
- Agent-payment rails: [Google AP2](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol); Visa [Intelligent Commerce](https://developer.visa.com/capabilities/visa-intelligent-commerce/overview) + [Trusted Agent Protocol](https://developer.visa.com/capabilities/trusted-agent-protocol/overview) ([GitHub](https://github.com/visa/trusted-agent-protocol)); Mastercard [Agent Pay](https://www.mastercard.com/us/en/business/artificial-intelligence/mastercard-agent-pay.html) + [agentic token framework](https://www.mastercard.com/us/en/news-and-trends/stories/2025/agentic-commerce-framework.html). ICC + the June 2026 OpenAI deal: [Visa newsroom](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22276.html), [The Paypers](https://thepaypers.com/payments/news/visa-launches-intelligent-commerce-connect-for-agentic-payments), [Axios](https://www.axios.com/2026/06/10/visa-chatgpt-agents-commerce), [SiliconANGLE](https://siliconangle.com/2026/06/10/visa-partners-openai-let-ai-agents-make-payments-users/).
- ACP / Instant Checkout: [OpenAI — Buy it in ChatGPT](https://openai.com/index/buy-it-in-chatgpt/), [Stripe — Instant Checkout + ACP](https://stripe.com/newsroom/news/stripe-openai-instant-checkout), [Stripe — open standard](https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce). Pullback: [CNBC](https://www.cnbc.com/2026/03/24/openai-revamps-shopping-experience-in-chatgpt-after-instant-checkout.html), [Forrester](https://www.forrester.com/blogs/what-it-means-that-the-leader-in-agentic-commerce-just-pulled-back/), [The Information — the Mar 5 scoop ("only a dozen")](https://www.theinformation.com/articles/openai-scales-back-shopping-plans-chatgpt), [The Information — 4% Shopify fee, on the record](https://www.theinformation.com/briefings/chatgpt-checkouts-take-4-cut-shopify-merchant-sales), [OpenAI — Powering Product Discovery (first-party, Mar 24, 2026)](https://openai.com/index/powering-product-discovery-in-chatgpt/), OpenAI ACP developer docs (developers.openai.com/commerce) — merchant remains merchant of record, owns chargebacks. Walmart conversion: [WIRED — the Danker interview (primary source)](https://www.wired.com/story/ai-lab-walmart-openai-shaking-up-agentic-shopping-deal/).
- Wider adoption (June 2026): [Stripe — Agentic Commerce Suite](https://stripe.com/newsroom/news/agentic-commerce-suite), [Stripe docs — ACP](https://docs.stripe.com/agentic-commerce/acp) + [UCP](https://docs.stripe.com/agentic-commerce/protocol), [Stripe Order Intents (private preview)](https://docs.stripe.com/order-intents), [agenticplug — protocol tracker](https://agenticplug.ai/current-state-of-agentic-commerce), [Opascope — Copilot Checkout / UCP coalition (aggregator coverage, not first-party)](https://opascope.com/insights/ai-shopping-assistant-guide-2026-agentic-commerce-protocols/).
- Amazon: [CNBC — injunction](https://www.cnbc.com/2026/03/10/amazon-wins-court-order-to-block-perplexitys-ai-shopping-agent.html), [PYMNTS — appeal](https://www.pymnts.com/legal/2026/perplexity-asks-federal-court-to-lift-amazon-shopping-agent-ban/), [Cooley — the PI's CFAA/§502 holding](https://www.cooley.com/news/insight/2026/2026-03-17-court-finds-ai-agent-may-violate-state-federal-law-by-accessing-amazon-accounts-without-authorization), [AWS×Visa (Dec 2025)](https://press.aboutamazon.com/aws/2025/12/visa-and-aws-enable-next-generation-agentic-commerce-capabilities), [ppc.land — Agentic Commerce Experiences org](https://ppc.land/amazon-quietly-builds-an-agentic-commerce-team-to-connect-with-chatgpt/), [About Amazon — Rufus → Alexa for Shopping](https://www.aboutamazon.com/news/retail/alexa-for-shopping-ai-assistant).
- Liability / fact-check: [fintechwrapup — the hidden liability of agentic commerce](https://www.fintechwrapup.com/p/deep-dive-the-hidden-liability-of), [eMarketer — Visa as neutral middle layer](https://www.emarketer.com/content/visa-s-agentic-commerce-hub-positions-network-agentic-middle-man), [CNBC Mar 20, 2026 — ~30 Shopify merchants (Forrester figure, Shopify-confirmed)](https://www.cnbc.com/2026/03/20/open-ai-agentic-shopping-etsy-shopify-walmart-amazon.html). **Removed in the June 11, 2026 pass:** the "~2.4×" dispute-rate figure (TrustSphere.ai vendor post; fabricated citations). Rule going forward: **no number counts until it's traced to a primary source** — vendor content in this space is partly AI-generated, with made-up citations.
