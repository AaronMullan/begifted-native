/**
 * Horizontal inset of the dashboard content column (matches
 * `dashboard.tsx` content `paddingHorizontal`). The home carousels cancel this
 * inset with a negative margin so cards bleed to the screen edges — the
 * Figma "card leakage" that signals a section is horizontally scrollable.
 */
export const HOME_EDGE_INSET = 20;

/** Gap between home carousel cards (matches `scrollContent.gap`). */
export const HOME_CARD_GAP = 10;

/**
 * Width of the next-card sliver that peeks past the second card. Derived from
 * the 402pt Figma frame, where the 175pt cards leave exactly 32pt of the next
 * card visible. We pin this and solve for the card width per device so the peek
 * is identical on every phone (DEV-162) instead of being a fixed-width
 * accident that only appears on wider screens.
 */
export const HOME_CARD_PEEK = 32;

/**
 * Card width that shows exactly two full cards plus {@link HOME_CARD_PEEK} of
 * the next, given the live window width (the carousel bleeds edge-to-edge, so
 * the window width is the usable track). Layout across the track:
 * `card · gap · card · gap · peek`. Solving for the card:
 *   2·W + 2·gap + peek = windowWidth  →  W = (windowWidth − 2·gap − peek) / 2
 * At the 402pt design frame this returns 175, matching Figma exactly.
 */
export function homeCardWidth(windowWidth: number): number {
  return (windowWidth - 2 * HOME_CARD_GAP - HOME_CARD_PEEK) / 2;
}
