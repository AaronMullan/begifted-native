/**
 * Color palette constants for the BeGifted app
 * Organized by category for consistent use across the application
 */

export const Colors = {
  // Neutrals - Card backgrounds, subtle elements
  neutrals: {
    light: "#f4e6dd",
    medium: "#ebdfbd",
    dark: "#dbd2c1",
  },

  // Blues - Primary actions, accents
  blues: {
    dark: "#1b4453",
    medium: "#5d8997",
    teal: "#07697e",
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
    medium: "#ae4b5f",
    light: "#e1a18b",
  },

  // Yellows - Gradient accents, highlights
  yellows: {
    gold: "#ac8b3f",
    amber: "#dea300",
    orange: "#faa750",
  },

  // Common colors
  white: "#FFFFFF",
  transparent: "transparent",
} as const;
