/**
 * Shared constants for the BeGifted app
 */

// Header height to account for when positioning content
export const HEADER_HEIGHT = 120;

// Approximate height of the bottom navigation bar (including padding)
// Used to add bottom padding to scrollable content so it isn't obscured
export const BOTTOM_NAV_HEIGHT = 80;

// Minimum gap between a CTA (or drawer edge) and the top of the software
// keyboard when it is open. Feed it to KeyboardAvoidingView's
// `keyboardVerticalOffset` so avoided content clears the keyboard by this gap.
export const KEYBOARD_CTA_GAP = 24;
