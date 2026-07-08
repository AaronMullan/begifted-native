/**
 * Color palette for the BeGifted app.
 *
 * The `brand` group is the canonical Figma palette (source: BeGifted pages_2
 * design file, node 28:47). Use brand tokens for new code. Legacy category
 * groups (neutrals/blues/etc.) remain for backward compatibility and resolve
 * to the same hex values where they overlap.
 */

export const Colors = {
  // Canonical Figma brand palette
  brand: {
    darkTeal: "#1A4453",
    mediumTeal: "#5E8896",
    lightTeal: "#94B4B0",
    buttonTeal: "#04697E",
    beige: "#DBD1C0",
    beigeMid: "#E7E1D6",
    gold: "#AB8A3E",
    rose: "#AD4B5F",
    cream: "#F4E6DD",
    pastZone: "#99ADB4",
  },

  // Linear gradient stops used by the "BeGifted light gradient" frame
  gradients: {
    light: ["#DBD1C0", "#E7E1D6", "#FFFFFF"] as const,
  },

  // Neutrals - Card backgrounds, subtle elements
  neutrals: {
    light: "#f4e6dd",
    medium: "#ebdfbd",
    dark: "#dbd2c1",
  },

  // Blues - Primary actions, accents
  blues: {
    dark: "#1A4453",
    medium: "#5E8896",
    teal: "#04697E",
    light: "#8deee2",
  },

  // Darks - Text, strong contrast elements
  darks: {
    brown: "#432013",
    burgundy: "#3a1521",
    black: "#050505",
  },

  // Pinks - Icon fills, accents
  pinks: {
    dark: "#c53064",
    medium: "#AD4B5F",
    light: "#e1a18b",
  },

  // Yellows - Gradient accents, highlights
  yellows: {
    gold: "#AB8A3E",
    amber: "#dea300",
    orange: "#faa750",
  },

  // Common colors
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  // Neutral grays used by pre-redesign screens. Prefer brand tokens for new
  // UI; these exist so legacy screens don't hardcode hex.
  grays: {
    dark: "#333333",
    text: "#666666",
    placeholder: "#999999",
    border: "#E0E0E0",
    hairline: "#f0f0f0",
    field: "#f5f5f5",
    surface: "#f8f8f8",
  },
} as const;
