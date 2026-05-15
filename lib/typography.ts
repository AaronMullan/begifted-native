import type { TextStyle } from "react-native";

/**
 * Typography tokens mirrored from Figma file "BeGifted pages_2" (node 28:47).
 *
 * The BG* tokens are the canonical text styles defined in the design file.
 * Display/serif tokens use Poltawski Nowy; UI/sans tokens use DM Sans.
 *
 * Apply via React Native Paper's <Text style={Typography.h1}> or by spreading
 * onto a custom StyleSheet entry.
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

export const Typography = {
  h1: {
    fontFamily: FontFamily.serif.semibold,
    fontSize: 32,
    lineHeight: 33,
  } satisfies TextStyle,
  h2: {
    fontFamily: FontFamily.serif.bold,
    fontSize: 16,
    lineHeight: 18,
  } satisfies TextStyle,
  h3: {
    fontFamily: FontFamily.serif.bold,
    fontSize: 12,
    lineHeight: 14,
  } satisfies TextStyle,
  subhead: {
    fontFamily: FontFamily.sans.medium,
    fontSize: 16,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: FontFamily.sans.regular,
    fontSize: 10,
  } satisfies TextStyle,
  largeCta: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 10,
    lineHeight: 12,
  } satisfies TextStyle,
  smallCta: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 8,
  } satisfies TextStyle,
  sectionHeadAc: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 10,
    lineHeight: 28,
    textTransform: "uppercase",
  } satisfies TextStyle,
  // Primary module headline (Figma "module: primary")
  moduleHeadline: {
    fontFamily: FontFamily.serif.medium,
    fontSize: 32,
    lineHeight: 33,
  } satisfies TextStyle,
  // Avatar initials in user pill (DM Sans 14 / 50)
  avatarInitials: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 14,
    lineHeight: 50,
  } satisfies TextStyle,
  // Bottom-nav labels
  navLabel: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: 9.625,
    lineHeight: 34.38,
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
