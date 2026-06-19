import { Colors } from "./colors";

/**
 * Brand-palette colors for the per-recipient occasion markers on the Moments
 * calendar. Recipients have no color field, so each one is assigned a stable
 * color by hashing its id — the same recipient gets the same color across every
 * render and across the month and day views. Matches the multi-color marker
 * look in the Figma "Moments" redesign without a schema change.
 */
const MARKER_PALETTE = [
  Colors.brand.mediumTeal,
  Colors.brand.rose,
  Colors.brand.gold,
  Colors.brand.pastZone,
] as const;

export function recipientMarkerColor(recipientId: string): string {
  let hash = 0;
  for (let i = 0; i < recipientId.length; i++) {
    hash = (hash * 31 + recipientId.charCodeAt(i)) | 0;
  }
  return MARKER_PALETTE[Math.abs(hash) % MARKER_PALETTE.length];
}
