/**
 * Dark "Ops Console" theme tokens for the admin panel (app/admin/*).
 *
 * The admin surface is deliberately its own visual world — a dark teal console
 * distinct from the light consumer app — so these tokens live apart from the
 * brand palette in colors.ts rather than being folded into it. Screens read
 * these instead of hardcoding hex so the console stays consistent across all
 * seven routes. Values derive from Colors.brand.* (teal/gold/rose) on a dark
 * teal ground.
 */

import { Platform } from "react-native";
import { MD3DarkTheme } from "react-native-paper";

export const AdminTheme = {
  // Page ground — vertical dark-teal gradient (top → bottom).
  gradient: ["#1F5666", "#163F4D", "#0F2B34"] as const,

  // Translucent surfaces layered over the gradient.
  panel: "rgba(255,255,255,0.045)",
  panelStrong: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.10)",
  borderSoft: "rgba(255,255,255,0.06)",
  inset: "rgba(0,0,0,0.22)",

  // Text.
  textStrong: "#FFFFFF",
  text: "#DFE9EC",
  muted: "#8FA8AF",
  faint: "#6F8A91",

  // Accents / semantic state.
  accent: "#04697E", // buttonTeal
  accentBright: "#2BA3B8",
  gold: "#AB8A3E",
  good: "#7FD4C4",
  warn: "#D8B869",
  bad: "#E79AA8",

  // Active nav highlight.
  navActive: "rgba(4,105,126,0.42)",
  navHover: "rgba(255,255,255,0.06)",
} as const;

/** Monospace stack for run_id / hash / prompt readouts (matches existing screens). */
export const adminMono = Platform.OS === "web" ? "monospace" : "Courier";

/**
 * Dark MD3 Paper theme scoped to the admin console. Wrapping the admin stack in
 * a PaperProvider with this theme makes Paper components (Button, Switch,
 * SegmentedButtons, Card mode="contained", Menu, Dialog) render dark without
 * per-instance recoloring. Screen StyleSheets still own their custom View/Text
 * colors via the AdminTheme tokens above.
 */
export const adminPaperTheme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: AdminTheme.accentBright,
    onPrimary: "#06222A",
    secondary: "#5E8896",
    background: AdminTheme.gradient[2],
    surface: "#132C35",
    // Contained cards read surfaceVariant — a translucent panel over the
    // gradient, matching the AdminTheme.panel look.
    surfaceVariant: "rgba(255,255,255,0.06)",
    onSurface: AdminTheme.text,
    onSurfaceVariant: AdminTheme.muted,
    onBackground: AdminTheme.text,
    outline: "rgba(255,255,255,0.22)",
    // Selected segment in SegmentedButtons.
    secondaryContainer: "rgba(4,105,126,0.55)",
    onSecondaryContainer: "#EAF7FA",
    // Menu (level2) and Dialog (level3) overlay surfaces.
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level2: "#16323C",
      level3: "#16323C",
    },
  },
};
