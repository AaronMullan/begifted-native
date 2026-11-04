/**
 * Beta UX check-in feedback (DEV-191). Read-only: the admin tab lists the
 * `beta_feedback` rows testers submitted; nothing in the app writes them.
 */

export type BetaCheckInScreen =
  "onboarding" | "first_recipient" | "first_gift_set";
