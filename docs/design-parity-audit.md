# Design Parity Audit — Figma Dev Mode (DEV-161)

**Date:** 2026-06-09
**Canonical file:** `BeGifted pages_FINAL_for-dev` — `SUQTk93YAXlLo7NxkXC7Br`
**Superseded file:** `vKruEWmOFcWGuYC8nHfsOU` ("BeGifted pages_2")
**Method:** Figma Dev Mode (`get_figma_data` MCP) against the dev-ready screens under the
file's "Designs read for Dev" board, reconciled against `lib/colors.ts`, `lib/typography.ts`,
and the app's font/scaling code.

Trigger: Erik raised parity gaps in #design (06-07) and provisioned Figma Pro dev seats (06-09).

## Headline finding

**The design tokens were already accurate.** The colors and the full type scale match the
canonical file 1:1, because every phone artboard is drawn at **402pt** (iPhone 16/17 Pro
logical width), and the tokens were mirrored directly as React Native points. The parity gaps
Erik described are **not wrong token numbers** — they are (a) a few stale values that lived only
in the doc, (b) the absence of a Figma→app type-scale conversion knob, and (c) responsive
layout work tracked separately.

## What was verified / corrected

### Colors — already in parity (no code change)

`darkTeal #1A4453`, `mediumTeal #5E8896`, `buttonTeal #04697E`, `beige #DBD1C0`,
`beigeMid #E7E1D6`, `gold #AB8A3E`, `rose #AD4B5F`, and the light gradient
`#DBD1C0 → #E7E1D6 → #FFFFFF` all match the named Design-Elements palette exactly.

### Type scale — verified, two doc fixes + one new token

All sizes match Dev Mode at 402pt. The token **code** was already correct; the **doc**
(`design-system.md`) listed three stale sizes, now fixed:

| Token           | Doc said | Actual (Figma + code) |
| --------------- | -------- | --------------------- |
| `eyebrow`       | 10       | **11**                |
| `largeCta`      | 10 / 12  | **11 / 12**           |
| `sectionHeadAc` | 10 / 28  | **11 / 28**           |

Added the one canonical style that was missing from the tokens:
`topCopy` — Poltawski Nowy 600, 12 / 14, title-case ("BG top copy").

Note: Figma defines `sectionHeadAc` line-height as `2px`; that is a design-file artifact, not
a literal. The app keeps **28** for section spacing — intentional deviation, documented.

### Spacing — new `lib/spacing.ts`

App screens use absolute positioning (no auto-layout), so spacing was derived from child
x/y/height deltas on `* Home_existing user`. Captured as `Spacing` tokens:

| Token                  | px  | Sits between                   |
| ---------------------- | --- | ------------------------------ |
| `screenGutter`         | 20  | screen edge → module           |
| `sectionHeadInset`     | 32  | screen edge → section head     |
| `cardGap`              | 10  | side-by-side cards             |
| `sectionHeadToContent` | 17  | section head → cards           |
| `moduleStackGap`       | 23  | module bottom → next element   |
| `sectionGap`           | 52  | card group → next section head |
| `bottomNavHeight`      | 55  | full-bleed nav                 |

### Module / component sizing (reference, in `design-system.md`)

primary `360×170` (r≈8), secondary `170×110` (r≈8.8), tertiary `170×70` (r12),
People `359×45` (r12), bottom nav `402×55`, sign-up button `153×33` (r24, `#04697E`),
avatar circle ≈30dia, generic card r12, header strips bottom-radius 18.

## "Fonts too small in-app" — parked for now

The token sizes already match Figma 1:1, and the app has no font-scaling utility — sizes render
as literal points. The "type reads small on a phone" feeling is a separate, app-wide question
(it would affect every screen, not just home) and is **not being addressed here** by team
decision. If we revisit it, the options are: bump the base sizes in Figma, or introduce a
deliberate responsive scale — but only after looking on a real device, not by guessing a
multiplier in code.

## Tickets this audit relates to

- **DEV-162** (Home modules resize so the next module peeks): this audit supplies its
  foundation — the **402pt** base frame and the module/spacing constants — but does **not**
  close it. Responsive resize is implementation work.
- **DEV-163** (recipient name + occasion on separate lines): same Slack thread; not affected by
  token values. Independent layout work.
- This audit makes **no** existing ticket redundant. It de-risks DEV-162 by pinning the canonical
  frame width and spacing.

## Follow-ups

1. DEV-162: decide the responsive strategy (scale layout by `deviceWidth / 402`).
2. Type sizing on-device is parked (see above) — revisit only if/when it's prioritized.
