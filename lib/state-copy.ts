/**
 * Copy spines for the app's waiting, empty and error states. Each family has
 * one sentence shape that takes the name of the thing it applies to, so every
 * screen in a family reads the same. The wording is product-owned and final;
 * change it here, never per screen. `docs/state-families.md` maps every state
 * in the app to its family.
 *
 * Safety refusals stay outside this system — they carry their own wording.
 */
export const StateCopy = {
  inProgress: (thing: string) => `We've got you. We're getting ${thing} ready.`,
  empty: (things: string) => `There are no ${things} here yet.`,
  giftIdeasNotDue: (name: string, occasion: string) =>
    `The gift ideas for ${name} will be available when ${occasion} gets closer.`,
  giftIdeasNoResults: (name: string) =>
    `We couldn't find three gift ideas for ${name} that met our quality standard.`,
  loadFailed: (thing: string) =>
    `Sorry for the inconvenience. We couldn't load ${thing}.`,
  saveFailed: (thing: string) => `We couldn't save ${thing}.`,
  offline: "You're offline.",
  permission: (permission: string, benefit: string) =>
    `BeGifted works best when you allow ${permission} to ${benefit}.`,
  /** Takes a singular subject: "The notifications feed", not "Notifications". */
  disabled: (feature: string) => `${feature} is off for now. Check back later.`,
  unavailable: (feature: string) =>
    `${feature} isn't available yet. We're working on making it awesome.`,
  fatal: "Something went wrong.",
};
