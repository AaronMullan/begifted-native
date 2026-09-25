/**
 * Copy spines for the app's waiting, empty and error states. Each family has
 * one sentence shape that takes the name of the thing it applies to, so every
 * screen in a family reads the same. The wording is product-owned and final;
 * change it here, never per screen.
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
};
