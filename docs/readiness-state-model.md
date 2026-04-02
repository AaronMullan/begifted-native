# Readiness State Model

## Problem

The current readiness system uses a single 0-10 score from the LLM plus a 4-message-count override to decide when to show the "Next Step" button during recipient intake. This creates false positives — users advance before the system has enough signal to generate meaningful gift recommendations. Conversation length is not a reliable proxy for information quality.

## Design Principle

Readiness should not be a single vague gate. It should answer: **"What is still missing for this recipient to become gift-ready?"**

A recipient is gift-ready only when the system has the minimum information needed to generate 3 non-generic gift concepts for one specific occasion, with a clear rationale, and without obvious mismatch.

The conversation is the place where all anchors get collected. The "Next Step" button should not appear until the system has what it needs. Moving forward should never mean "come back later and finish this recipient."

## The Three Anchors

All three must be present before the user can proceed.

### 1. Recipient Anchor

We know who the person is in a meaningful way.

**Minimum:** name or clear descriptor, plus relationship or life-stage context.

### 2. Occasion Anchor

We know what moment we are solving for.

**Minimum:** birthday, anniversary, holiday, Mother's Day, Father's Day, graduation, etc., or another specific gifting moment/date.

If a personal occasion is mentioned WITHOUT a specific date, the anchor is still satisfied — but a `needs_occasion_date` flag is set so the concierge follows up for the date in a subsequent message.

### 3. Specificity Anchor

We have enough signal to avoid generic gifting.

**Minimum:** one strong signal, or two weak signals, or an explicit user skip.

**Strong signals:**
- Specific hobby or obsession
- Aesthetic or style preference
- Hard no / avoid / clutter boundary
- Favorite brands, artists, authors, teams, foods, etc.
- Meaningful life-stage context tied to taste

**Weak signals:**
- Broad interests (cooking, sports, travel)
- Age / general life stage
- Loose personality description
- Generic contextual detail

**Explicit skip:** If the user indicates they're unsure or done ("not sure", "skip", "that's all I have"), the specificity anchor is satisfied. `user_skipped_specificity` is set to `true`.

**Important rule:** If we only know the person and the occasion, but the person still feels generic, the system is not gift-ready.

## State Model

Instead of a single score, the system uses a discrete state based on which anchors are present:

| State | Recipient | Occasion | Specificity | Description |
|---|---|---|---|---|
| `not_captured` | - | - | - | Not enough info to identify the person |
| `captured_needs_both` | yes | - | - | Know the person, need occasion + specificity |
| `captured_needs_occasion` | yes | - | yes | Know the person well, need a gifting moment |
| `captured_needs_specificity` | yes | yes | - | Know person + occasion, profile too generic |
| `ready` | yes | yes | yes | Enough info to generate recommendations |

## Context Extraction Schema

Each exchange triggers a context extraction call that returns:

| Field | Type | Description |
|---|---|---|
| `name` | `string \| null` | Recipient's name if mentioned |
| `relationship` | `string \| null` | Relationship if established |
| `interests` | `string[]` | Any interests or hobbies mentioned |
| `birthday` | `string \| null` | YYYY-MM-DD, MM-DD, or descriptive |
| `occasions_mentioned` | `string[]` | Holidays, occasions, or dates |
| `needs_occasion_date` | `boolean` | True if a personal occasion lacks a date |
| `occasion_needing_date` | `string \| null` | Which occasion needs a date |
| `user_skipped_specificity` | `boolean` | True if user explicitly chose to skip |
| `other_details` | `string` | Brief summary of other context |
| `readiness` | `object` | State, anchors, missing requirements |
| `readiness_score` | `number` | 0-10 debugging score (legacy) |

### Readiness Object Shape

```json
{
  "readiness": {
    "state": "captured_needs_specificity",
    "can_move_on": false,
    "gift_ready": false,
    "has_recipient_anchor": true,
    "has_occasion_anchor": true,
    "has_specificity_anchor": false,
    "missing_requirements": ["specificity_anchor"],
    "reason": "We know the person and occasion but need more specific details to avoid generic suggestions."
  }
}
```

### Field Definitions

- **`state`** — One of the five states above. Informational; the button is NOT derived from this field.
- **`can_move_on`** — `true` when all anchors are satisfied (including skip). Equivalent to `gift_ready` in practice.
- **`gift_ready`** — `true` only when all three anchors are present. Controls whether gift generation should proceed.
- **`has_recipient_anchor`** / **`has_occasion_anchor`** / **`has_specificity_anchor`** — Boolean flags for each anchor. These are the source of truth.
- **`missing_requirements`** — Array of missing anchor names.
- **`reason`** — One-sentence explanation of the assessment.

## Deterministic Button Logic

The "Next Step" button is controlled by deterministic logic in the edge function, NOT by the LLM's state classification. This prevents inconsistencies where the LLM's state string contradicts its own boolean anchors.

```typescript
// Normalize: user skip satisfies specificity
const effectiveSpecificityAnchor =
  readiness.has_specificity_anchor ||
  !!contextInfo.user_skipped_specificity;

// Button shown only when all three anchors are true
const shouldShowNextStepButton =
  readiness.has_recipient_anchor &&
  readiness.has_occasion_anchor &&
  effectiveSpecificityAnchor;
```

Why deterministic:
- The LLM's `state` field can lag behind its own boolean flags
- `user_skipped_specificity` may be `true` while `has_specificity_anchor` is still `false` on the same turn
- Deterministic normalization ensures the button appears immediately when the user skips

## Conversation Behavioral Rules

### One-Ask-Per-Message Rule

Each AI response contains exactly ONE question or call-to-action. The concierge never combines multiple asks (e.g., asking for a date AND hobbies). This prevents user overwhelm and keeps the conversation focused.

### Priority Order

When multiple anchors are missing, the concierge follows this strict priority:

1. **Recipient identity** (name + relationship) — if not yet captured
2. **Date follow-up** — HIGHEST PRIORITY when a personal occasion is mentioned without a date
3. **Occasion** — if recipient is known but no giftable moment identified
4. **Specificity** — probing question about interests/hobbies
5. **Skip offer** — if user seems unsure after specificity probe
6. **Wrap-up** — all anchors captured, direct to Next Step button

### Date Follow-Up Behavior

When a personal occasion (birthday, anniversary) is mentioned without a specific date:
- The occasion anchor IS satisfied (the occasion exists)
- `needs_occasion_date` is flagged `true`
- The concierge asks ONLY for the date in the next response
- No other questions are combined with the date ask

Date follow-up phrasing must be warm and conversational. Examples:
- "Do you happen to know the date of Tim's birthday? I'd love to keep track of it."
- "When is Tim's birthday? I'll make sure we don't miss it."

Avoid robotic constructions like "Can you tell me Tim's birthday date?"

### Skip-to-Proceed Flow

When the specificity anchor is the last remaining requirement:
1. **First attempt:** Ask one specific probing question about interests or preferences
2. **Second attempt** (user seems unsure): Offer to skip — "If you're not sure what else to add right now, that's totally fine — we can always update their profile later. Would you like to skip for now?"
3. **On skip:** Treat specificity as satisfied, set `user_skipped_specificity = true`, direct user to click Next Step

### Button Reference Rule

The concierge NEVER mentions "Click Let's move to the next step" until ALL three anchors are captured. Before that point, the button text is not referenced at all.

## Rules

- Conversation length must **never** increase readiness by itself.
- Prefer conservative judgment. If unsure, mark `gift_ready: false` and explain what is missing.
- The return shape (TypeScript types) stays hard-coded in code. The semantic definitions live in the extractor prompt.
- `readiness_score` (0-10) is retained as a secondary/debugging field only, not a primary gate.
- 2-4 sentences max per concierge response.
- Never repeat questions about already-captured info.
- Always end with a clear, singular call-to-action.

## Implementation

### Files to modify

1. **`supabase/functions/types.ts`** — Add `ReadinessState` type, `Readiness` interface. Add `readiness`, `needs_occasion_date`, `occasion_needing_date`, `user_skipped_specificity` to `ContextInfo`.

2. **`supabase/functions/recipient-conversation/data-extractor.ts`**:
   - Rewrite the quick context extraction prompt (lines 45-60) to request the full schema including readiness object, `needs_occasion_date`, `user_skipped_specificity`.
   - Remove `max_tokens` from the context extraction call.
   - Replace `shouldShowNextStepButton` logic (lines 226-232) with deterministic boolean-based check.
   - Update fallback `contextInfo` (lines 92-95, 100-103) to default to `not_captured` state.
   - Update existing-data branch (lines 30-42) to default to `ready` state.

3. **`app/admin/playground.tsx`** — Replace "Readiness: X/10" display with full readiness state visualization (state chip, anchor indicators, missing requirements, reason).

### Files that need no changes (pass-through)

- `hooks/use-conversation-flow.ts` — `conversationContext` is `any`, `shouldShowNextStepButton` is boolean
- `hooks/use-add-recipient-flow.ts` — passes through
- `components/recipients/conversation/ConversationView.tsx` — only uses the boolean

### Extractor Prompt Instructions

The context extraction prompt should include this instruction text:

> A recipient should not be judged by conversation length. Do NOT use number of exchanges as a proxy for readiness.
>
> Determine what information is still missing for this recipient to become gift-ready in the current flow.
>
> Mark gift_ready as true only when BeGifted has the minimum information needed to generate 3 non-generic gift concepts for one specific occasion, with a clear rationale, and without obvious mismatch.
>
> A recipient is gift-ready only when ALL of the following are true:
>
> **Recipient anchor:** The conversation identifies the person in a meaningful way. This requires a name or clear person descriptor, plus relationship or life-stage context.
>
> **Occasion anchor:** The conversation identifies at least one specific giftable moment. Examples: birthday, anniversary, Mother's Day, Father's Day, Christmas, graduation, wedding, new baby, recovery, or another clear occasion/date. If a personal occasion is mentioned without a specific date, the anchor is still satisfied — set `needs_occasion_date` to true and `occasion_needing_date` to the occasion name.
>
> **Specificity anchor:** The conversation contains enough information to avoid a generic gift. This requires either one strong signal or two weak signals. If the user explicitly indicates they're unsure or done ("not sure", "skip", "that's all I have"), set `user_skipped_specificity` to true — this satisfies the anchor.
>
> Strong signals include: specific interests/hobbies/obsessions, aesthetic or style preferences, hard no's/avoid lists/clutter boundaries, favorite brands/artists/authors/teams/cuisines/categories, meaningful life-stage context tied to taste.
>
> Weak signals include: broad interests, approximate age or general life stage, loose personality descriptors, generic other details.
>
> If the conversation only establishes the person and the occasion, but the recipient still feels generic, mark as not gift-ready.
>
> Prefer conservative judgment. If unsure, mark gift_ready as false and explain what is missing.

### Verification

1. Deploy edge function and test via curl with varying inputs:
   - All 3 anchors present -> `ready`, button visible
   - Name + relationship only -> `captured_needs_both`, button hidden
   - Name + relationship + occasion, no specifics -> `captured_needs_specificity`, button hidden
   - Name + relationship + specific hobby, no occasion -> `captured_needs_occasion`, button hidden
   - Vague message, no name -> `not_captured`, button hidden
   - User says "that's all I know" after specificity probe -> `user_skipped_specificity` true, button visible
   - "Her birthday is in March" (no date) -> occasion anchor satisfied, `needs_occasion_date` true
2. Verify playground displays new readiness fields
3. Run through add-recipient flow in simulator to confirm button behavior
