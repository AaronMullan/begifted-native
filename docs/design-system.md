# BeGifted Design System

Source: Figma file **`BeGifted pages_FINAL_for-dev`** (`SUQTk93YAXlLo7NxkXC7Br`), node
`28:47` ("BeGifted Design Elements"). This is the canonical dev file — the dev-ready
screens live under its "Designs read for Dev" board. Superseded file: `vKruEWmOFcWGuYC8nHfsOU`.
Last sync: 2026-06-09 (Figma Dev Mode parity audit, DEV-161).

**Canonical frame width: 402pt** (iPhone 16/17 Pro logical width). Every phone artboard
is 402×874, so raw Figma point values map 1:1 to React Native points. See
`docs/design-parity-audit.md` for the full audit and the type-scale conversion note.

Tokens live in:

- `lib/colors.ts` → `Colors.brand`
- `lib/typography.ts` → `Typography`, `FontFamily`, `Radii`
- `lib/spacing.ts` → `Spacing`, `DESIGN_FRAME_WIDTH`

## Colors

| Token              | Hex       | Use                                                |
| ------------------ | --------- | -------------------------------------------------- |
| `brand.darkTeal`   | `#1A4453` | Headings on light, dark CTAs, deep tile bg         |
| `brand.mediumTeal` | `#5E8896` | Primary module bg, bottom nav bg, secondary titles |
| `brand.lightTeal`  | `#94B4B0` | Decorative dots, light accents                     |
| `brand.buttonTeal` | `#04697E` | Sign-up / primary action button fill               |
| `brand.beige`      | `#DBD1C0` | Cards, light tile, gradient top stop               |
| `brand.beigeMid`   | `#E7E1D6` | Gradient mid stop                                  |
| `brand.gold`       | `#AB8A3E` | Eyebrows, small CTA links, accent text             |
| `brand.rose`       | `#AD4B5F` | Tertiary accent, alert / love states               |
| `brand.cream`      | `#F4E6DD` | Soft surface, neutral light                        |

### Gradients

- `Colors.gradients.light`: `linear-gradient(180deg, #DBD1C0 0% → #E7E1D6 75% → #FFFFFF 100%)`

## Typography

Two primary families: **Poltawski Nowy** (serif display) and **DM Sans** (UI sans). Both loaded in `hooks/use-fonts-loader.ts`.

| Token            | Family / Weight    | Size / Line   | Notes                                 |
| ---------------- | ------------------ | ------------- | ------------------------------------- |
| `h1`             | Poltawski Nowy 600 | 32 / 33       | Page-level display                    |
| `h2`             | Poltawski Nowy 700 | 16 / 18       | Section heads                         |
| `h3`             | Poltawski Nowy 700 | 12 / 14       | Card titles                           |
| `subhead`        | DM Sans 500        | 16            | Lead body                             |
| `eyebrow`        | DM Sans 400        | 11            | "In 7 days • May 5" labels            |
| `largeCta`       | DM Sans 600        | 11 / 12       | Primary CTA link                      |
| `smallCta`       | DM Sans 600        | 8             | Inline CTA link                       |
| `sectionHeadAc`  | DM Sans 600        | 11 / 28 UPPER | Button labels, all-caps section heads |
| `topCopy`        | Poltawski Nowy 600 | 12 / 14 Title | Title-case top copy                   |
| `moduleHeadline` | Poltawski Nowy 500 | 32 / 33       | Primary module hero                   |
| `avatarInitials` | DM Sans 600        | 14 / 50       | Avatar bubble                         |
| `navLabel`       | DM Sans 600        | 9.625 / 34.38 | Bottom nav text                       |

All sizes are verified 1:1 against Dev Mode at the 402pt frame. Notes:
`eyebrow` / `largeCta` / `sectionHeadAc` are **11**, not 10 (earlier doc revisions listed 10).
`sectionHeadAc` line-height is **28** in-app (Figma's `2px` is a design artifact, not literal).

> Fraunces is still loaded for legacy screens (`FontFamily.fraunces.*`). New work should use Poltawski Nowy via `FontFamily.serif.*` to match Figma.

## Radii

| Token  | px  |
| ------ | --- |
| `sm`   | 8   |
| `md`   | 12  |
| `lg`   | 18  |
| `pill` | 24  |

## Spacing (`lib/spacing.ts`)

Pulled from Dev Mode on the dev-ready `* Home_existing user` screen (402×874).
App screens are absolutely positioned (no auto-layout), so these are derived from
child x/y/height deltas — they are the reference for closing the vertical-spacing gap.

| Token                  | px  | Sits between                           |
| ---------------------- | --- | -------------------------------------- |
| `screenGutter`         | 20  | Screen edge → module left/right        |
| `sectionHeadInset`     | 32  | Screen edge → all-caps section head    |
| `cardGap`              | 10  | Side-by-side cards in a row            |
| `sectionHeadToContent` | 17  | Section head → cards beneath           |
| `moduleStackGap`       | 23  | Module bottom → next stacked element   |
| `sectionGap`           | 52  | Stacked card group → next section head |
| `bottomNavHeight`      | 55  | Full-bleed nav, flush to bottom edge   |

`DESIGN_FRAME_WIDTH` (402) is the frame these were measured against; use it to derive
a `deviceWidth / 402` ratio if a responsive scale is added (DEV-162).

## Component blueprints (from Figma)

### Bottom nav (`2003:219`)

- 402×55, `brand.mediumTeal` fill
- Three groups (Home/People/Moments), each ~28–44 wide
- Icon white SVG, label `Typography.navLabel` white, center-aligned

### Module: primary (`2003:252`)

- 360×170, radius ~8, `brand.mediumTeal` fill
- Headline `Typography.moduleHeadline` white, inset 19/20
- CTA "View … >" `largeCta` white, inset 19/139

### Module: secondary (`2003:349`)

- 170×110, radius ~8.8, white fill
- Eyebrow `eyebrow` in `brand.gold`, inset 10/12
- Title `Poltawski Nowy 700 16/18` `brand.mediumTeal`, inset 10/30
- CTA `smallCta` `brand.gold`, inset 10/82

### Module: tertiary (`2003:350`)

- 170×70, radius 12, transparent fill, 2px white stroke
- Title `Typography.h3` `brand.mediumTeal`, inset 10/11
- CTA `smallCta` `brand.gold`, inset 10/46

### People module (`2010:541`)

- 359×45, radius 12, white fill
- 28×28 avatar circle at 8/11 (D9D9D9 ellipse + image)
- Name `Typography.h3` `brand.darkTeal` at 43/10
- CTA `smallCta` `brand.gold` at 43/28

### Sign-up button (`2006:825`)

- 153×33, radius `pill` (24), `brand.buttonTeal` fill
- Label "SIGN ME UP" `Typography.sectionHeadAc` white, centered

### Avatar pill (`29:115`)

- 32×50 frame, 32×32 ellipse `#FFFFFF` bg, initials `Typography.avatarInitials` in `brand.darkTeal`

## Asset references

- Logo: `assets/images/BeGifted Logo Red.svg`, wordmark: `assets/images/BeGifted wordmark.svg`
- Rendered via inline path data in `components/BrandMark.tsx` / `BrandWordmark.tsx` (no svg-transformer)

## Refresh procedure

1. Open Figma file `SUQTk93YAXlLo7NxkXC7Br` ("BeGifted pages_FINAL_for-dev"), node `28:47`.
2. Use the official Figma MCP to pull tokens: `get_variable_defs` for the bound color/type tokens, `get_design_context` for exact type/spacing/sizing. (Not Framelink's `get_figma_data` — it omits applied icon color; see CLAUDE.md → _Implementing from Designs_.)
3. Diff against `Colors.brand`, `Typography`, and `Spacing`; update all three, then update this doc.
