# Traction dashboard — settled design

Admin screen answering "is the product being used?" for non-engineer teammates (Matt, Caspian, Erik). Terms used here are defined in the root `CONTEXT.md` (Generation Run, Active User, Gift Chosen, Traction).

## Placement & access

- New screen `app/admin/dashboard.tsx`, titled **Traction**, inside the existing `app/admin/` group — gating is inherited from `app/admin/_layout.tsx` (profile `is_admin`), same as Playground.
- Viewed through the Expo **web** build on Vercel; live on merge, no OTA. Viewers each have admin logins — no shared links.
- Not in be-gifted: that repo has no rendered pages, and building an auth/UI surface there was rejected.

## Data path

- Direct Supabase reads from the client under the existing admin-read RLS policies (`clicks.tsx` pattern). Policies already exist for `product_events`, `gift_generation_runs`, `outbound_clicks`, and admin profile listing.
- Query on load only — no snapshots, no realtime. Trends are derived from `created_at` at query time.
- If a query outgrows client-side aggregation, add a single Postgres RPC — not a backend API surface. (Judged easily reversible; no ADR.)

## Metrics & layout (top to bottom)

1. **Tile row** — Total Users (+7d delta) · Active Users (7d) · Activation % (users with ≥1 recipient) · Gifts Chosen (+7d)
2. **Trends** — 8 weeks, weekly grain: New signups · Outbound clicks · Generation Runs with success rate
3. **Gift decisions** — `gift_feedback` action breakdown, horizontal bars
4. **Upcoming** — count of occasions in the next 30 days
5. **Trials & subscriptions** — status counts from `profiles` GTM lifecycle fields; expected to read zero until the GTM funnel ships, placed low deliberately
6. **Ops strip** — Generation Run health: % ok, error and timeout counts, trailing 7 days

Definitions:

- **Active User** = ≥1 row in `product_events` ∪ `outbound_clicks` ∪ `gift_feedback` in the trailing 7 days. (`product_events` alone is a sparse 4-event lifecycle sink and undercounts.)
- **Gift Chosen** = `gift_feedback.action = 'chose'`.
- Success for a Generation Run = `gift_generation_runs.status = 'ok'`.

## Presentation

- Tiles: all-time totals + trailing-7-day delta. Charts: last 8 weeks, weekly. No range picker.
- Charts hand-rolled with `react-native-svg` (already a dependency); no chart library.
- React Native Paper components throughout, per repo convention.

## Out of scope (considered and rejected)

- Realtime updates and daily snapshot tables — derivable at query time at current scale.
- Shared secret link or public access.
- BI tools (Metabase/Retool) — contradicts lean-team posture.
- Rename of `searches.tsx` screen title to "Generation Runs" is a cheap tag-along when convenient; the filename stays.
