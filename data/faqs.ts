/**
 * In-app Help & FAQ copy.
 *
 * Source of truth: Caspian's approved "BeGifted In-App FAQ" copydeck
 * (first pass approved by Matt on 2026-06-10). Loaded as the built-in
 * fallback used by `lib/faq-sheet.ts` when EXPO_PUBLIC_FAQ_SHEET_ID is unset.
 *
 * Gating (DEV-153): five copydeck entries are intentionally held back because
 * they describe features that are not live in the beta yet. Their full approved
 * copy is preserved in the GATED_FAQS block below — when the related work ships,
 * uncomment each entry and move it into the `faqs` array in its copydeck section.
 */
export const faqs = [
  // Getting Started
  {
    q: "What is BeGifted?",
    a: "BeGifted is an AI gift concierge that helps you keep track of the people who matter, remember important occasions, and find thoughtful ways to show up.\n\nIt is not just a reminder app. BeGifted helps you understand the moment, consider the relationship, and choose a gift or gesture that feels personal.",
  },
  {
    q: "How does BeGifted work?",
    a: "You add people you care about and share whatever you know about them — interests, personality, relationship details, important dates, or anything else that feels useful.\n\nBeGifted uses that information to help identify meaningful occasions and recommend thoughtful gift ideas when the timing is right.",
  },
  {
    q: "How much do I need to tell BeGifted?",
    a: "A little is enough to get started. You can share basic details, like someone’s age, relationship to you, interests, or important dates.\n\nThe more BeGifted learns over time, the more personal and useful the recommendations can become.",
  },
  // People & Occasions
  {
    q: "Who should I add to BeGifted?",
    a: "Add anyone you want to show up for more thoughtfully — family, close friends, partners, coworkers, clients, or anyone else who matters to you.",
  },
  {
    q: "Can I update what BeGifted knows about someone?",
    a: "Yes. You can update a person’s profile as you learn more about them or as their interests change.\n\nBeGifted uses those updates to improve future recommendations.",
  },
  // Gift Ideas
  {
    q: "How does BeGifted choose gift ideas?",
    a: "BeGifted looks at the person, your relationship to them, the occasion, your budget, their interests, and past feedback.\n\nThe goal is not to give you a long list. The goal is to give you a few strong ideas that feel considered.",
  },
  {
    q: "Why does BeGifted usually show only a few gift ideas?",
    a: "BeGifted is designed to reduce the work of gifting, not give you another endless shopping list.\n\nWhen possible, BeGifted recommends up to three strong options so you have enough choice without having to sort through too much.",
  },
  {
    q: "Are recommendations influenced by paid placements?",
    a: "No. BeGifted is designed to recommend what best fits the person, the relationship, and the occasion.",
  },
  {
    q: "Do I buy gifts inside BeGifted?",
    a: "No. During beta, BeGifted recommends gifts and sends you to the retailer’s site to complete the purchase.\n\nThe retailer handles checkout, payment, shipping, returns, and order support.",
  },
  {
    q: "What if a gift idea feels wrong?",
    a: "Tell BeGifted. You can give feedback on a gift idea, remove it, mark that they already have it, flag a product issue, or choose the idea you like.\n\nThat feedback helps BeGifted improve future recommendations for that person.",
  },
  {
    q: "What does “Keep this in the mix” mean?",
    a: "“Keep this in the mix” tells BeGifted that the idea is promising, even if you are not ready to choose it yet.\n\nIt helps BeGifted understand what kinds of ideas feel close.",
  },
  {
    q: "What does “I chose this gift” mean?",
    a: "“I chose this gift” tells BeGifted that you selected that idea.\n\nThat feedback helps BeGifted learn what worked and improve future recommendations.",
  },
  // Privacy & Data
  {
    q: "What happens to the information I share?",
    a: "The information you share helps BeGifted personalize your experience, remember important details, and make better recommendations.\n\nYou can update or remove information from a person’s profile. For more detail, review BeGifted’s Privacy Policy.",
  },
  {
    q: "Does BeGifted need access to my contacts?",
    a: "No. You can add people manually.\n\nIf you choose to import a contact, BeGifted uses that information to help you add that person more easily.",
  },
  // Access & Support
  {
    q: "Is BeGifted available on iPhone?",
    a: "The current beta is for iPhone.\n\nBeta access is limited while we test, improve, and expand the experience.",
  },
];

/**
 * GATED_FAQS — approved copy held back until the related feature ships (DEV-153).
 * Not rendered. To restore an entry, move it into `faqs` above (into the section
 * noted in its comment) once the linked work is live.
 */
// {
//   // People & Occasions — restore when DES-5 (add/edit occasions from profile) ships
//   q: "Can I add or edit occasions for someone?",
//   a: "Yes. You can add, edit, or remove occasions from a person’s profile so BeGifted knows which moments matter.",
// },
// {
//   // People & Occasions — restore when DEV-154 (recurring occasions) ships
//   q: "Do occasions repeat every year?",
//   a: "Some occasions, like birthdays and anniversaries, can repeat every year so you do not have to recreate them each time.",
// },
// {
//   // Access & Support — restore when DES-6 (Support & Help contact flow) ships
//   q: "How do I get help?",
//   a: "Go to Support & Help in Settings to contact the BeGifted team.",
// },
// {
//   // Access & Support — restore when DES-7 (forgot password) ships
//   q: "What if I forget my password?",
//   a: "Use “Forgot password” on the sign-in screen to reset your password.",
// },
// {
//   // Access & Support — restore when DES-7 (resend verification email) ships
//   q: "Can I resend my verification email?",
//   a: "Yes. From the verification screen, you can request a new verification email.",
// },
