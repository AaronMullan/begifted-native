/**
 * Centralized design system theme constants
 * Extracted from Hero, ContentBlock, and BrandGrid components
 */

// Colors
export const colors = {
  // Primary brand colors
  primaryTeal: "#52A78B", // Hero background
  darkTeal: "#396D75", // ContentBlock background
  brownOrange: "#BB693E", // BrandGrid background
  
  // Text colors
  darkText: "#231F20", // Button background, text
  white: "#fff", // Text on colored backgrounds
  gray: "#666", // Secondary text
  
  // Background colors
  lightPurple: "#E6E6FA", // Dashboard background
  lightGray: "#f0f0f0", // Borders, backgrounds
  lightGrayAlt: "#f8f8f8", // Alternative light gray
} as const;

// Fonts
export const fonts = {
  display: "AzeretMono_400Regular", // Logo/display
  hero: "Times New Roman", // Hero italic text
  body: "RobotoFlex_400Regular", // Body text, headings
} as const;

// Spacing
export const spacing = {
  // Padding
  padding: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 60,
  },
  // Margins
  margin: {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 30,
    xxxl: 32,
  },
  // Content
  contentMaxWidth: 1200,
} as const;

// Border Radius
export const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
} as const;

// Shadows
export const shadows = {
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

// Button Styles
export const buttonStyles = {
  primary: {
    backgroundColor: colors.darkText,
    paddingHorizontal: spacing.padding.xxl,
    paddingVertical: spacing.padding.md,
    color: colors.white,
    fontSize: 16,
    fontWeight: "bold" as const,
  },
} as const;

// Responsive Breakpoints
export const breakpoints = {
  tablet: 768,
  desktop: 1024,
} as const;

