import type { BetaCheckInScreen } from "../../lib/api";
import type { CheckInConfig } from "./BetaCheckInSheet";

/**
 * Copy for the three beta UX check-ins (DEV-191), verbatim from the Figma
 * frames (SUQTk93YAXlLo7NxkXC7Br nodes 2113:1488 / 2132:1448 / 2133:1504).
 * Option `value`s are the stable keys written to the `beta_feedback.responses`
 * jsonb -- don't rename them once testers have submitted, or aggregation splits.
 */
export const BETA_CHECK_IN_CONFIGS: Record<BetaCheckInScreen, CheckInConfig> = {
  onboarding: {
    screen: "onboarding",
    heading: "How did it feel telling us about yourself?",
    subtext: "You just helped BeGifted start to understand you.",
    radios: [
      {
        id: "felt_easy",
        label: "Did that feel easy?",
        options: [
          { value: "natural_and_easy", label: "Natural and easy" },
          { value: "a_little_open_ended", label: "A little open-ended" },
          { value: "form_would_be_easier", label: "A form would be easier" },
        ],
      },
      {
        id: "used_voice",
        label: "Did you use voice-to-text?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "no_might_next_time", label: "No, but I might next time" },
        ],
      },
    ],
  },
  first_recipient: {
    screen: "first_recipient",
    heading: "How did it feel adding this person?",
    subtext: "You just added someone who matters to you.",
    radios: [
      {
        id: "easy_to_describe",
        label: "Did the questions make it easy to describe them?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
          { value: "no_might_next_time", label: "No, but I might next time" },
        ],
      },
    ],
    freeText: {
      label: "Anything you wanted to add that we didn't ask about?",
      placeholder: "Optional — one line is fine",
    },
  },
  first_gift_set: {
    screen: "first_gift_set",
    heading: "Did these gift ideas feel right?",
    subtext:
      "You just reviewed a set of gift ideas.\nHelp us understand how they landed.",
    radios: [
      {
        id: "felt_right",
        label: "Did the ideas feel right for this person?",
        options: [
          { value: "spot_on", label: "Spot on" },
          { value: "close", label: "Close" },
          { value: "off_base", label: "Off-base" },
        ],
      },
      {
        id: "stronger_if",
        label: "What would have made them stronger?",
        options: [
          { value: "more_specific_to_them", label: "More specific to them" },
          { value: "better_price_fit", label: "Better price fit" },
          { value: "more_their_taste", label: "More their taste" },
          { value: "other", label: "Other" },
        ],
      },
    ],
    freeText: {
      label: "Anything you wanted to add that we didn't ask about?",
      placeholder: "Optional — one line is fine",
    },
  },
};
