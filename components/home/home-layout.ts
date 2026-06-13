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
 * the next, given the live window width.
 *
 * The carousel track spans the full window, but its content is inset by one
 * {@link HOME_EDGE_INSET} on the left so the first card aligns with the content
 * column (the hero card, section labels). The peek then appears at the right
 * screen edge. Layout from the left screen edge:
 *   inset · card · gap · card · gap · peek
 * Solving for the card:
 *   inset + 2·W + 2·gap + peek = windowWidth
 *   → W = (windowWidth − inset − 2·gap − peek) / 2
 *
 * Dropping the `inset` term (the original DEV-162 bug) made every card 10pt too
 * wide, which pinned the peek at a constant ~12pt on all devices instead of 32 —
 * present but too subtle to read as "scroll me". At the 402pt design frame this
 * now returns 165; the next card peeks a true 32pt on every width.
 */
export function homeCardWidth(windowWidth: number): number {
  return (
    (windowWidth - HOME_EDGE_INSET - 2 * HOME_CARD_GAP - HOME_CARD_PEEK) / 2
  );
}
