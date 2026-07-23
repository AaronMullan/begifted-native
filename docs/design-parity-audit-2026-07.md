# Screen-Level Design Parity Audit (DEV-315)

**Date:** 2026-07-23
**Canonical file:** `BeGifted pages_FINAL_for-dev` — `SUQTk93YAXlLo7NxkXC7Br`
**Trigger:** Erik reviewed the latest TestFlight build and saw a mix of new and old design
([#design thread](https://bgftd.slack.com/archives/C0B430JCS20/p1784772777724169)).
**Method:** every user-facing route (and its component tree) classified by which design system
it renders — redesign tokens (`Typography.*`, `Colors.brand.*`, `Spacing.*`, Poltawski Nowy /
DM Sans) vs legacy (Fraunces, RobotoFlex, MD3 Paper variants, legacy palette, raw hex) —
cross-referenced against the Figma Main-page frame inventory (342 top-level nodes across
Main/Archive/Explorations; 19 READY_FOR_DEV on Main).

This complements `design-parity-audit.md` (DEV-161), which audited the **tokens** — those
were and remain correct. This audit is about which **screens** actually use them.

## Verdicts

Legend: **NEW** = fully on redesign tokens · **MOSTLY-NEW** = on redesign with named remnants ·
**MIXED** = substantial legacy styling alongside new.
"Alias-only" remnants (`Colors.blues.dark` === `Colors.brand.darkTeal`, etc.) are **not
visual drift** — they render identically and are tracked as hygiene (DEV-321).

| Route                                                                     | Verdict                                | Visible legacy?                                                                                        | Follow-up |
| ------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- |
| `(tabs)/notifications.tsx`                                                | MIXED (old content under new gradient) | **Yes — whole screen**                                                                                 | DEV-316   |
| `index.tsx` + `components/Auth.tsx` (sign-in)                             | MIXED                                  | **Yes — black CTA, MD3 text, raw status hex**                                                          | DEV-317   |
| `(tabs)/settings/profile.tsx`                                             | MIXED                                  | **Yes — MD3 title, raw grays/pinks**                                                                   | DEV-318   |
| `onboarding/{welcome,identity,recipient,confirmation}.tsx`                | MOSTLY-NEW                             | **Yes — Fraunces headline on all four**                                                                | DEV-319   |
| `(tabs)/calendar.tsx`                                                     | MOSTLY-NEW                             | **Yes — occasion dialogs only** (Fraunces via `recipient-dialog-styles.ts`, `#cc0000` destructive CTA) | DEV-320   |
| `(tabs)/dashboard.tsx` (home)                                             | MOSTLY-NEW                             | Loading/fallback states only                                                                           | DEV-321   |
| `(tabs)/contacts/index.tsx`                                               | MOSTLY-NEW                             | Loading text only (RobotoFlex)                                                                         | DEV-321   |
| `(tabs)/contacts/add.tsx`                                                 | MOSTLY-NEW                             | Spinner/error color only                                                                               | DEV-321   |
| `(tabs)/contacts/[id].tsx`                                                | MOSTLY-NEW                             | Alias colors only                                                                                      | DEV-321   |
| `intro/signup.tsx`                                                        | MOSTLY-NEW                             | One alias color                                                                                        | DEV-321   |
| `components/BottomNav.tsx`                                                | MOSTLY-NEW                             | Alias colors only                                                                                      | DEV-321   |
| `gifts/[id].tsx`                                                          | NEW                                    | Spinner alias only                                                                                     | DEV-321   |
| `(tabs)/settings/{index,gifting,billing,legal,support,notifications}.tsx` | NEW                                    | Loading-text alias only                                                                                | DEV-321   |
| `faq.tsx`                                                                 | NEW                                    | —                                                                                                      | —         |
| `intro/index.tsx`                                                         | NEW                                    | —                                                                                                      | —         |
| `components/Header.tsx`                                                   | NEW                                    | Bug-icon tint alias only                                                                               | DEV-321   |

No screen is purely OLD — everything mounts at least the gradient chrome. The screens a
tester actually _sees_ as old are the five with visible legacy above; the rest is code
hygiene invisible on device.

## Figma coverage gaps (for Erik's hand-off doc)

- **Notifications feed has no Main-page design.** Only an exploration exists
  (`notifications`, 5533:13033, Explorations page). DEV-316 is blocked on confirming the
  target with Erik.
- **Beta Feedback — Dark 1–3** (2113:1488, 2132:1448, 2133:1504) are READY_FOR_DEV on Main
  but no corresponding screen exists in the app. Product decision needed on whether/where
  this flow ships — not filed as a parity ticket.
- One stale READY_FOR_DEV duplicate sits on the Archive page (4261:1435) — ignore it, per
  the known stale-duplicate trap (CLAUDE.md → MCP for design semantics).

## Follow-up tickets

- **DEV-316** (High) — notifications screen content is fully pre-redesign
- **DEV-317** — sign-in / create-account screens (`Auth.tsx`)
- **DEV-318** — settings/profile residual legacy
- **DEV-319** — onboarding headlines still Fraunces (4 one-line fixes + variant cleanup)
- **DEV-320** — calendar occasion dialogs (also fixes shared `recipient-dialog-styles.ts`)
- **DEV-321** (Low) — alias/hex hygiene, no visual change
