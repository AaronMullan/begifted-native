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

## Root cause: "fonts too small in-app, fine in Figma"

There is **no font-scaling utility** in the app (no `moderateScale` / `RFValue` /
`PixelRatio`-based normalization). `Typography` sizes render as literal points. Two
consequences:

1. **Width is not the cause.** The design frame (402pt) is _wider_ than most test devices
   (393/390/375pt), so if anything literal points read slightly _large_ relative to a narrower
   screen — not small. A width-based conversion alone would not fix Erik's complaint.
2. **Absolute size + viewing context is the cause.** The canonical scale is genuinely small in
   places (8–12pt for CTAs/eyebrows/titles). Those read fine in Figma zoomed to fill a monitor,
   but are tiny on a physical phone. Closing this needs a **global type-scale decision**, not a
   number copied from Figma.

### What shipped: the conversion _mechanism_ (not the value)

`lib/typography.ts` now multiplies every size by `TYPE_SCALE` (default **1.0** — zero visual
change). This gives one knob to dial type up app-wide after on-device review, instead of editing
every token. **`TYPE_SCALE` should stay 1.0 until a multiplier is agreed on-device with Erik**
(likely ~1.1–1.25; confirm by side-by-side on a real device). This is the design-decision part of
the ticket and is intentionally left for sign-off.

`DESIGN_FRAME_WIDTH` (402) is exported so a responsive `deviceWidth / 402` ratio can be layered
on later if desired.

## Tickets this audit relates to

- **DEV-162** (Home modules resize so the next module peeks): this audit supplies its
  foundation — the **402pt** base frame and the module/spacing constants — but does **not**
  close it. Responsive resize is implementation work.
- **DEV-163** (recipient name + occasion on separate lines): same Slack thread; not affected by
  token values. Independent layout work.
- This audit makes **no** existing ticket redundant. It de-risks DEV-162 by pinning the canonical
  frame width and spacing.

## Follow-ups requiring design sign-off

1. Pick the `TYPE_SCALE` multiplier on-device (or bump the base sizes in Figma instead).
2. Decide the responsive strategy for DEV-162 (scale layout by `deviceWidth / 402`).
