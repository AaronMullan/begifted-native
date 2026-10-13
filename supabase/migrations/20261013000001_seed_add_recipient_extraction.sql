-- v1 of the Add Recipient turn-extractor prompt, edited and versioned in the
-- Playground. Equal to ADD_RECIPIENT_EXTRACTION_DEFAULT in
-- supabase/functions/recipient-conversation/prompts.ts, so seeding it changes
-- no behavior. Skipped if any version already exists.
INSERT INTO system_prompt_versions (prompt_key, version, prompt_text, change_notes, is_active)
SELECT
  'add_recipient_extraction',
  1,
  $prompt$CONTEXT ANALYSIS — Extract what we know so far from this conversation and assess gift-readiness.

{{conversationHistory}}

A recipient should not be judged by conversation length. Do NOT use number of exchanges as a proxy for readiness.

Determine what information is still missing for this recipient to become gift-ready in the current flow.

A recipient is gift-ready only when ALL of the following are true:

**Recipient anchor:** The conversation identifies the person in a meaningful way. This requires a name or clear person descriptor, plus ANY relationship or connection context. Relationship means any description of how the user relates to this person — family (mom, brother), social (friend, colleague, neighbor), or admiration/fandom (hero, idol, inspiration, mentor, favorite artist). "My guitar hero", "my favorite author", "someone I admire" ALL count as valid relationships.

**Occasion anchor:** The conversation identifies at least one specific giftable moment. Examples: birthday, anniversary, Mother's Day, Father's Day, Christmas, graduation, wedding, new baby, recovery, or another clear occasion/date. If a personal occasion is mentioned without a specific date, the anchor is still satisfied — set needs_occasion_date to true and occasion_needing_date to the occasion name.

**Specificity anchor:** The conversation contains enough information to avoid a generic gift. This requires either one strong signal or two weak signals. If the user explicitly indicates they're unsure or done ("not sure", "skip", "that's all I have"), set user_skipped_specificity to true — this satisfies the anchor.

Strong signals include: specific interests/hobbies/obsessions, aesthetic or style preferences, hard no's/avoid lists/clutter boundaries, favorite brands/artists/authors/teams/cuisines/categories, meaningful life-stage context tied to taste.

Weak signals include: broad interests, approximate age or general life stage, loose personality descriptors, generic other details.

DISTINGUISHING vs BROAD texture: a distinguishing signal materially narrows who the recipient is or shows how they engage with something they care about (e.g. "reads mostly history and biographies", "follows the Trail Blazers closely", "collects Japanese vinyl toys"). Broad signals are bare categories that do not distinguish the person (e.g. "books", "sports", "music", "has kids") — and several broad signals stacked together stay broad; quantity is not specificity. Personality-only traits ("funny", "thoughtful", "outgoing") are not distinguishing.

specificity_followup_used: set true only when the assistant has ALREADY asked a targeted texture follow-up (a second texture question that drills into one existing interest, e.g. "What kind of books does he usually reach for?") AND the user has answered it. The initial open-ended "What's [Name] like?" ask does NOT count as the follow-up.

specificity_followup_questions_asked: count how many SHARPENING texture follow-up questions the ASSISTANT has asked across the whole conversation. A sharpening follow-up is a texture question that drills into one interest/trait the user already mentioned (e.g. "What kind of books does he read?", "Is there a team he follows closely?"). Do NOT count the initial open-ended "What's [Name] like?" question, and do NOT count questions about name, relationship, occasions, dates, price, or age. Return an integer (0 if none). This is a plain count of assistant questions, NOT a judgment about whether they were useful — a follow-up the user answered with "not sure" / "nothing specific" / a vague reply STILL counts, and the count is cumulative across the whole conversation and never decreases, even if intervening messages asked about price, age, or dates.

last_assistant_asked_specificity_followup: look ONLY at the assistant's single most recent message. Set true if that one message was a sharpening texture follow-up — a question that drills into a specific interest or trait the user already mentioned (e.g. "What kind of food is she especially into?", "What kind of music does he listen to?", "Is there a team he follows closely?"). Set false for the initial open-ended texture ask ("What's [Name] like?", "Tell me a little about [Name]") and for ANY question about name, relationship, occasions, dates, price, or age. Judge only that single most-recent assistant message — not the whole conversation. This is the reliable per-turn signal the runtime uses to spend the one allowed follow-up.

final_answer_added_texture: judge ONLY the user's most recent message. Set true when that single message contributed distinguishing recipient texture (a specific detail that narrows who they are or how they engage with something they care about) — including an answer to a sharpening follow-up, but ONLY when that answer is itself distinguishing. TRUE examples: "mostly history and political biographies", "a big Trail Blazers fan who watches most of their games", "makes ceramics and loves very minimal interiors". Set false when the latest message is a bare anchor answer (an age, price, date, name, or occasion), a broad or generic detail (whether a single loose category or a bare list of them), or a vague/"not sure" reply — even if distinguishing texture appeared earlier in the conversation. FALSE examples: "he's 44", "around $100", "November 12", "he likes cooking", "books, sports, and he has kids", "pop and rock", "honestly, nothing specific comes to mind". This is a per-turn signal, not cumulative.

recipient_is_child: set true ONLY when the conversation makes clear the recipient is a child/minor (roughly under 18) — an explicit young age or school stage ("she's 7", "my 2nd grader", "a toddler", "in kindergarten", "a baby"), or the recipient is clearly the user's young kid/grandkid/niece/nephew described as a child. Do NOT set true from a relationship word alone (a "son"/"daughter"/"nephew" can be a grown adult) or from any single interest. Default false whenever age/life-stage is unclear. This gates whether the flow must capture an age or birthday before completing, so gift ideas for a kid don't skew old.

If the conversation only establishes the person and the occasion, but the recipient still feels generic, mark as not gift-ready.

Be accurate, not conservative. If the anchors are clearly satisfied, mark them as true. Only mark an anchor as false if the information is genuinely missing from the conversation.

Return JSON with what's been established:

{
  "name": "person's name if clearly mentioned, null otherwise",
  "relationship": "relationship if established, null otherwise",
  "interests": ["any interests mentioned"],
  "birthday": "birthday if mentioned. Use YYYY-MM-DD only when the year is explicitly stated. If only month and day are known, use MM-DD (e.g. '12-07'). If only the year is known ('born in 1961'), return just the year as 'YYYY'. A two-digit year in a numeric date (9/11/61) is the full year (1961) — expand it. Never substitute placeholder years like 0000 or a placeholder month/day like 01-01 — omit the part you don't know. {{approximateBirthdayRule}} Return null if no birthday is mentioned.",
  "occasions_mentioned": ["array of holidays/occasions mentioned (e.g., 'christmas', 'anniversary', 'kwanzaa')"],
  "needs_occasion_date": false,
  "occasion_needing_date": null,
  "occasions_needing_dates": ["array of occasion names that still require user-provided timing — exclude fixed holidays like Christmas, Valentine's Day, Mother's Day, Father's Day, Thanksgiving, Halloween, Easter, etc. A birthday whose timing is captured in the birthday field, exactly or as an approximate range, no longer needs a date."],
  "has_price_guidance": false,
  "price_guidance_raw": "exact quote or paraphrase of price/spend mentioned, null if none",
  "has_age_context": false,
  "age_context_raw": "exact age, grade, stage, or life-stage mentioned (e.g. '17', 'high school senior', 'retired', 'toddler'), null if none — do NOT infer from relationship, hobbies, graduation, or occasion alone",
  "recipient_is_child": false,
  "has_distinguishing_texture": false,
  "final_answer_added_texture": false,
  "specificity_followup_used": false,
  "specificity_followup_questions_asked": 0,
  "last_assistant_asked_specificity_followup": false,
  "user_skipped_specificity": false,
  "other_details": "brief summary of other key details gathered"
}$prompt$,
  'Initial v1 seed, equal to the extractor prompt previously inline in code',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM system_prompt_versions WHERE prompt_key = 'add_recipient_extraction'
);
