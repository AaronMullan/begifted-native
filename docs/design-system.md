# BeGifted Design System

Source: Figma file `BeGifted pages_2`, node `28:47` ("BeGifted Design Elements").
Last sync: 2026-05-15.

Tokens live in:
- `lib/colors.ts` → `Colors.brand`
- `lib/typography.ts` → `Typography`, `FontFamily`, `Radii`

## Colors

| Token | Hex | Use |
|---|---|---|
| `brand.darkTeal` | `#1A4453` | Headings on light, dark CTAs, deep tile bg |
| `brand.mediumTeal` | `#5E8896` | Primary module bg, bottom nav bg, secondary titles |
| `brand.lightTeal` | `#94B4B0` | Decorative dots, light accents |
| `brand.buttonTeal` | `#04697E` | Sign-up / primary action button fill |
| `brand.beige` | `#DBD1C0` | Cards, light tile, gradient top stop |
| `brand.beigeMid` | `#E7E1D6` | Gradient mid stop |
| `brand.gold` | `#AB8A3E` | Eyebrows, small CTA links, accent text |
| `brand.rose` | `#AD4B5F` | Tertiary accent, alert / love states |
| `brand.cream` | `#F4E6DD` | Soft surface, neutral light |

### Gradients
- `Colors.gradients.light`: `linear-gradient(180deg, #DBD1C0 0% → #E7E1D6 75% → #FFFFFF 100%)`

## Typography

Two primary families: **Poltawski Nowy** (serif display) and **DM Sans** (UI sans). Both loaded in `hooks/use-fonts-loader.ts`.

| Token | Family / Weight | Size / Line | Notes |
|---|---|---|---|
| `h1` | Poltawski Nowy 600 | 32 / 33 | Page-level display |
| `h2` | Poltawski Nowy 700 | 16 / 18 | Section heads |
| `h3` | Poltawski Nowy 700 | 12 / 14 | Card titles |
| `subhead` | DM Sans 500 | 16 | Lead body |
| `eyebrow` | DM Sans 400 | 10 | "In 7 days • May 5" labels |
| `largeCta` | DM Sans 600 | 10 / 12 | Primary CTA link |
| `smallCta` | DM Sans 600 | 8 | Inline CTA link |
| `sectionHeadAc` | DM Sans 600 | 10 / 28 UPPER | Button labels, all-caps section heads |
| `moduleHeadline` | Poltawski Nowy 500 | 32 / 33 | Primary module hero |
| `avatarInitials` | DM Sans 600 | 14 / 50 | Avatar bubble |
| `navLabel` | DM Sans 600 | 9.625 / 34.38 | Bottom nav text |

> Fraunces is still loaded for legacy screens (`FontFamily.fraunces.*`). New work should use Poltawski Nowy via `FontFamily.serif.*` to match Figma.

## Radii

| Token | px |
|---|---|
| `sm` | 8 |
| `md` | 12 |
| `lg` | 18 |
| `pill` | 24 |

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

1. Open Figma file `vKruEWmOFcWGuYC8nHfsOU`, node `28:47`.
2. Use Figma MCP `get_figma_data` to pull tokens.
3. Diff against `Colors.brand` and `Typography`; update both, then update this doc.
