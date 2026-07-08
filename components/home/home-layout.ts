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
 * the 402pt "NEW option 1" frame (4302:1538), where the 175pt horizon cards
 * leave exactly 12pt of the next card visible. We pin this and solve for the
 * card width per device so the peek is identical on every phone (DEV-162)
 * instead of being a fixed-width accident that only appears on wider screens.
 */
export const HOME_CARD_PEEK = 12;

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
 * Dropping the `inset` term (the original DEV-162 bug) made every card 10pt
 * too wide, which turned the intended peek into a fixed-width accident. At the
 * 402pt design frame this returns the spec 175; the next card peeks a true
 * {@link HOME_CARD_PEEK} on every width.
 */
export function homeCardWidth(windowWidth: number): number {
  return (
    (windowWidth - HOME_EDGE_INSET - 2 * HOME_CARD_GAP - HOME_CARD_PEEK) / 2
  );
}

/**
 * Width of the next-card sliver visible to the RIGHT of the active Next Up
 * card. From the "NEW option 1" frame (4302:1538): the active 230pt card sits
 * at the 20pt gutter and the next card fills the rest of the 402pt frame past
 * a {@link HOME_CARD_GAP}, so 402 − 20 − 230 − 10 = 142pt of it shows.
 */
export const NEXT_UP_PEEK = 142;

/**
 * Next Up card width for the gutter-aligned snapping carousel (frame
 * 4302:1538). The active card is left-aligned with the content column and the
 * next card peeks {@link NEXT_UP_PEEK} at the right screen edge:
 *   inset · W · gap · peek = windowWidth
 *   → W = windowWidth − inset − gap − peek
 * At the 402pt design frame this returns the spec 230.
 */
export function nextUpCardWidth(windowWidth: number): number {
  return windowWidth - HOME_EDGE_INSET - HOME_CARD_GAP - NEXT_UP_PEEK;
}
