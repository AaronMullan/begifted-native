-- Persist structured role + household context on recipients so the
-- occasion_recommendations prompt can use them in production. Populated
-- by the synthesize-recipient-profile edge function from the same
-- conversation context that generates synthesized_profile.

ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS known_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS household_context TEXT;
