# Design Coverage Audit — App Screens vs. Figma & the DES project

**Date:** 2026-06-14 (updated same day after a Jira hygiene pass)
**Canonical Figma file:** `BeGifted pages_FINAL_for-dev` — `SUQTk93YAXlLo7NxkXC7Br`
**Design tracking:** the **DES** Jira project (one Story per screen/surface, subtasks for detail work).
**Method:** App routes under `app/` (Expo Router) cross-referenced against (a) the frames in the
canonical Figma file and (b) the DES backlog. Figma "tier" = the design's **promotion status**
(whether it's in the `Designs read for Dev` board); the DES column = whether design is **tracked**.

Distinct from `docs/design-parity-audit.md` (DEV-161), which audits design **tokens**
(colors/type/spacing). This audit is about **screen coverage**.

## Headline

- Only **8 frames** are formally promoted to the `Designs read for Dev` board (Tier 1).
- Most built screens (People, Calendar, Chat, Beta feedback) were built against **un-promoted**
  canvas explorations (Tier 2) — they work, but no blessed spec backs them.
- "No design delivered" is **not** the same as "untracked": the **DES** project already tracks
  most pending design work (Settings, Moments, People detail, legal/notice surfaces, etc.).
- After this pass, the only screen that was undesigned **and** untracked — the **Notifications
  feed** — now has a ticket (**DES-23**).

---

## Tier 1 — Dev-ready (in the `Designs read for Dev` board)

The only frames Figma has formally blessed for build.

| App target             | Figma frame                                          |
| ---------------------- | ---------------------------------------------------- |
| `(tabs)/dashboard.tsx` | `* Home_existing user`, `* Home_new user`            |
| Gift drawer component  | `* Bottom drawer – gift options/keep gift`           |
| Gift drawer component  | `* Bottom drawer – gift options/feedback`            |
| Gift drawer component  | `* Bottom drawer – gift feedback input`              |
| `onboarding/*` (1–3)   | `* Onboarding_1`, `* Onboarding_2`, `* Onboarding_3` |

---

## Tier 2 — Designed but NOT promoted (loose canvas frames)

These exist — some marked canonical with a `*` prefix — but sit on the canvas outside the
dev-ready board. Treat as WIP / not blessed for build.

| App target                          | Figma frame(s)                                                                                                                           | DES tracking                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `(tabs)/contacts/index.tsx`         | `* People_landing/list` (+ `> add more people`)                                                                                          | DES-13 (People)                       |
| `(tabs)/contacts/[id].tsx`          | `People_details`, `* People_gift recommendation`                                                                                         | DES-13 → DES-15 (detail page)         |
| recipient gift rec (accordion)      | `* People_gift recommendation V2_start` + `expanded option 1/2/3`                                                                        | delivered: DES-19 (Done, via DEV-165) |
| `(tabs)/calendar.tsx`               | `*Moments_start (month view)`, `Moments_click in (day view)`, `Moments_year view`, `Year overview`, `Moments_landing`, `Moments_details` | DES-8 → DES-10 (blocks DEV-72)        |
| recipient chat (`contacts/add.tsx`) | `* Chat: Recipient`                                                                                                                      | —                                     |
| self / identity chat                | `* Chat: Yourself`                                                                                                                       | —                                     |
| `onboarding/*` (later steps)        | `Onboarding_4`–`Onboarding_7`                                                                                                            | —                                     |
| `intro/signup.tsx`                  | `Login error_1/2/3`                                                                                                                      | DES-1 (terms), DES-7 (recovery)       |
| Beta feedback component             | `* Beta feedback 1–3` (light/dark)                                                                                                       | —                                     |

---

## Tier 3 — No delivered Figma design

Reconciled against the DES backlog — most of these are **design pending (tracked)**, not untracked.

| App screen                                                               | Design status                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------- | -------- | -------------------------------- |
| `(tabs)/settings/index.tsx`                                              | pending — DES-9 (Settings) → DES-11 (main), DES-16 (drawers) |
| `(tabs)/settings/billing                                                 | gifting                                                      | notifications | profile` | pending — under DES-9 (Settings) |
| `(tabs)/settings/support.tsx`                                            | pending — DES-6 (Support & Help)                             |
| Settings: Legal & Privacy section                                        | pending — DES-2 (blocks DEV-144)                             |
| `(tabs)/notifications.tsx` (feed)                                        | **newly tracked — DES-23** (was the one untracked gap)       |
| `faq.tsx`                                                                | shipped via DEV-153; relates to DES-6                        |
| `gifts/[id].tsx` (standalone gift detail)                                | covered by the People/drawer gift designs                    |
| `admin/*` (ai-model, clicks, kill-switch, playground, prompts, searches) | internal tools — undesigned by intent                        |
| `index.tsx`                                                              | splash/redirect — technical, no design needed                |

---

## DES → DEV blocking links (after the 2026-06-14 hygiene pass)

| Design (DES)                        | Blocks dev (DEV) |
| ----------------------------------- | ---------------- |
| DES-1 (signup terms checkbox)       | DEV-143          |
| DES-2 (settings legal & privacy)    | DEV-144          |
| DES-3 (add-recipient legal notices) | DEV-146, DEV-147 |
| DES-4 (push pre-prompt)             | DEV-148          |
| DES-10 (Moments calendar screens)   | DEV-72           |
| DES-20 (profile avatar)             | DEV-169          |
| DES-21 (excluded-retailers UX)      | DEV-166          |
| DES-22 (profile above chat)         | DEV-174          |

Convention reinforced this pass: design-blocked DEV tickets carry the **`blocked-by-design`**
label (retired the one-off `needs-design`).

> Note: the **DES-22 ↔ DEV-174** link was originally backwards ("DEV-174 blocks DES-22"); it was
> deleted and recreated this pass so all four audited links now read "DES blocks DEV".

---

## Takeaways

1. Only Home, the 3 gift drawers, and Onboarding 1–3 are actually **dev-ready**. Everything
   else built (People, Calendar, Chat, Beta feedback) was built against **un-promoted** designs.
2. The backlog is healthier than the raw Figma view suggests — **Settings, Moments, People
   detail, and the legal/notice surfaces are all tracked in DES**, just not delivered.
3. **Calendar is the biggest live gap**: rich Moments designs exist but aren't promoted, the
   design ticket (DES-10) is still To Do, and the app (`calendar.tsx`) is a flat month-grouped
   list — so DEV-72 stays Blocked.
4. **Notifications feed** was the only undesigned-and-untracked surface; now DES-23.

## Follow-up candidates

- Promote / finalize the Moments designs (DES-10) to unblock DEV-72.
- Confirm `Chat: Yourself` and `People_gift recommendation V2` parity with what's shipped.
- Decide whether `Chat`, later Onboarding steps, and Beta feedback need their own DES tickets.
