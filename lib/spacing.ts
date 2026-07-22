/**
 * Spacing tokens pulled from Figma Dev Mode against the canonical file
 * "BeGifted pages_FINAL_for-dev" (SUQTk93YAXlLo7NxkXC7Br), Home/Onboarding
 * screens. See docs/design-parity-audit.md (DEV-161).
 *
 * The app screens in Figma are absolutely positioned on 402×874 frames (no
 * auto-layout), so these values were derived from child x/y/height deltas on
 * the dev-ready "* Home_existing user NEW option 1" screen (4302:1538). They
 * are the canonical
 * reference for closing the vertical-spacing parity gap Erik raised in
 * #design — apply them when a screen is reconciled against the design.
 */

export const Spacing = {
  /** Left/right screen gutter (module left edge at x=20 on a 402 frame). */
  screenGutter: 20,
  /** Left inset for all-caps section heads ("NEXT UP", "On the horizon"). */
  sectionHeadInset: 32,
  /** Horizontal gap between side-by-side cards in a row. */
  cardGap: 10,
  /** Gap between a section head and the row of cards beneath it. */
  sectionHeadToContent: 7,
  /** Gap between a module's bottom and the next stacked element. */
  moduleStackGap: 18,
  /** Gap between a stacked card group and the next section head. */
  sectionGap: 41,
  /** Gap between the hero/add-people stack and the first section head. */
  heroToSectionGap: 31,
  /** Bottom-nav bar height (full-bleed, flush to the bottom edge). */
  bottomNavHeight: 55,

  // Form/settings rhythm tokens from the hand-off spacing spec. The Home
  // screen keeps its own measured tokens above — don't swap one set for the
  // other.
  /** Screen margin for settings/auth/dedicated form screens. */
  marginStandard: 32,
  /** Screen margin for browse/list/feed screens and drawer-nested cards. */
  marginCompact: 20,
  /** Vertical gap between adjacent form fields. */
  fieldGap: 20,
  /** Tighter field-to-field gap allowed on onboarding/auth screens. */
  fieldGapAuth: 16,
  /** Gap between the last field and the submit CTA. */
  fieldToCta: 32,
  /** Gap between a section header and the module beneath it. */
  sectionHeadToModule: 10,
  /** Vertical gap between one section's content and the next section head. */
  formSectionGap: 32,
} as const;

/**
 * Canonical design frame the values above were measured against.
 * Used to derive the Figma → app point ratio (deviceWidth / 402) if/when a
 * responsive scale is introduced for DEV-162.
 */
export const DESIGN_FRAME_WIDTH = 402;
