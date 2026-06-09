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
 * Figma → app conversion: the design frames are 402pt wide (iPhone 16/17 Pro
 * logical width), so the raw Figma font sizes map 1:1 to React Native points.
 * `TYPE_SCALE` is the global knob for the parity gap Erik raised in #design
 * (type reads correctly in Figma but small on-device). It defaults to 1.0 (no
 * visual change); bump it app-wide once a multiplier has been agreed on-device
 * with design. See docs/design-parity-audit.md (DEV-161).
 */

/**
 * Global type-scale multiplier. Keep at 1.0 until a value is signed off with
 * design — changing it rescales every token below at once.
 */
export const TYPE_SCALE = 1.0;

/** Apply TYPE_SCALE to a raw Figma point value (exact passthrough at 1.0). */
const t = (n: number): number => (TYPE_SCALE === 1 ? n : n * TYPE_SCALE);

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
    fontSize: t(32),
    lineHeight: t(33),
  } satisfies TextStyle,
  h2: {
    fontFamily: FontFamily.serif.bold,
    fontSize: t(16),
    lineHeight: t(18),
  } satisfies TextStyle,
  h3: {
    fontFamily: FontFamily.serif.bold,
    fontSize: t(12),
    lineHeight: t(14),
  } satisfies TextStyle,
  subhead: {
    fontFamily: FontFamily.sans.medium,
    fontSize: t(16),
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: FontFamily.sans.regular,
    fontSize: t(11),
  } satisfies TextStyle,
  largeCta: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: t(11),
    lineHeight: t(12),
  } satisfies TextStyle,
  smallCta: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: t(8),
  } satisfies TextStyle,
  sectionHeadAc: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: t(11),
    // Figma defines lineHeight 2px here; in-app we use 28 for section spacing.
    lineHeight: 28,
    textTransform: "uppercase",
  } satisfies TextStyle,
  // Title-case top copy (Figma "BG top copy": Poltawski Nowy 600 12/14)
  topCopy: {
    fontFamily: FontFamily.serif.semibold,
    fontSize: t(12),
    lineHeight: t(14),
    textTransform: "capitalize",
  } satisfies TextStyle,
  // Primary module headline (Figma "module: primary")
  moduleHeadline: {
    fontFamily: FontFamily.serif.medium,
    fontSize: t(32),
    lineHeight: t(33),
  } satisfies TextStyle,
  // Avatar initials in user pill (DM Sans 14 / 50)
  avatarInitials: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: t(14),
    lineHeight: t(50),
  } satisfies TextStyle,
  // Bottom-nav labels
  navLabel: {
    fontFamily: FontFamily.sans.semibold,
    fontSize: t(9.625),
    lineHeight: t(34.38),
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
