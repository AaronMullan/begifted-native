import { PixelRatio } from "react-native";
import type { TextStyle } from "react-native";

/**
 * Typography tokens mirrored from Figma file "BeGifted pages_FINAL_for-dev"
 * (file SUQTk93YAXlLo7NxkXC7Br, "BeGifted Design Elements" node 28:47).
 *
 * The BG* tokens are the canonical text styles defined in the design file.
 * Display/serif tokens use Poltawski Nowy; UI/sans tokens use DM Sans.
 *
 * Apply via React Native Paper's <Text style={Typography.h1}> or by spreading
 * onto a custom StyleSheet entry.
 *
 * The design frames are 402pt wide (iPhone 16/17 Pro logical width), so the raw
 * Figma font sizes map 1:1 to React Native points.
 */

export const FontFamily = {
  serif: {
    regular: "PoltawskiNowy_400Regular",
    medium: "PoltawskiNowy_500Medium",
    semibold: "PoltawskiNowy_600SemiBold",
    bold: "PoltawskiNowy_700Bold",
  },
  sans: {
    regular: "DMSans_400Regular",
    medium: "DMSans_500Medium",
    semibold: "DMSans_600SemiBold",
  },
  // Legacy display face kept for screens that still use Fraunces
  fraunces: {
    regular: "Fraunces_400Regular",
    italic: "Fraunces_400Regular_Italic",
    semibold: "Fraunces_600SemiBold",
  },
  mono: {
    regular: "AzeretMono_400Regular",
  },
  body: {
    regular: "RobotoFlex_400Regular",
  },
} as const;

/**
 * A numeric lineHeight does not track the OS accessibility text size the way
 * fontSize does, so at large Dynamic Type a tight line box clips the scaled
 * glyph. Multiplying the pin by the font scale keeps the box proportional to the
 * glyph. Read once at module load, so a live text-size change reflows on the next
 * launch; at the default scale it returns the design value, leaving normal-size
 * layouts unchanged. Apply only to tight glyph-height pins — not line-heights
 * used to vertically center text inside a fixed-height container.
 */
export const scaleLineHeight = (lineHeight: number): number =>
  lineHeight * PixelRatio.getFontScale();

export const Typography = {
  h1: {
    fontFamily: FontFamily.serif.semibold,
    fontSize: 32,
    lineHeight: scaleLineHeight(33),
  } satisfies TextStyle,
  h2: {
    fontFamily: FontFamily.serif.bold,
    fontSize: 22,
    lineHeight: scaleLineHeight(23),
  } satisfies TextStyle,
  h3: {
    fontFamily: FontFamily.serif.bold,
    fontSize: 16,
    lineHeight: scaleLineHeight(17),
  } satisfies TextStyle,
  subhead: {
    fontFamily: FontFamily.sans.medium,
    fontSize: 16,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: FontFamily.sans.regular,
    fontSize: 11,
  } satisfies TextStyle,
  largeCta: {
    fontFamily: FontFamily.sans.semibold,
    // The published Figma token is 14/18, not the 16/20 in DEV-243's table —
    // both redesign frames (4305:1504, 4170:15802) report largeCta 14/18.
    fontSize: 14,
    lineHeight: scaleLineHeight(18),
  } satisfies TextStyle,
  smallCta: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 8,
  } satisfies TextStyle,
  sectionHeadAc: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 12,
    // Tight line box (= the glyph; Figma publishes 100% line height) so the
    // label doesn't add phantom leading above/below itself. Section spacing is
    // owned by the layout gaps (Spacing.sectionGap above,
    // Spacing.sectionHeadToContent below); an inflated lineHeight here
    // double-counted it and pushed the heads ~8pt too far from both the
    // preceding module and the cards.
    lineHeight: scaleLineHeight(12),
    textTransform: "uppercase",
  } satisfies TextStyle,
  // Title-case top copy (Figma "BG top copy": Poltawski Nowy 600 12/14)
  topCopy: {
    fontFamily: FontFamily.serif.semibold,
    fontSize: 12,
    lineHeight: scaleLineHeight(14),
    textTransform: "capitalize",
  } satisfies TextStyle,
  // Primary module headline (Figma "module: primary")
  moduleHeadline: {
    fontFamily: FontFamily.serif.medium,
    fontSize: 32,
    lineHeight: scaleLineHeight(33),
  } satisfies TextStyle,
  // Avatar initials in user pill (DM Sans 14 / 50)
  avatarInitials: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 14,
    lineHeight: 50,
  } satisfies TextStyle,
  // Bottom-nav labels. No lineHeight: the nav centers labels via flex, and a
  // pinned line box would stretch the nav row at large Dynamic Type.
  navLabel: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 9.625,
  } satisfies TextStyle,
} as const;

/**
 * Radii used across Figma components.
 * Default card/tile radius is 12; legacy modules use 8.
 */
export const Radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 24,
} as const;
