-- Replace rigid user_stack + default_gifting_tone with a single free-text gifting_summary
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gifting_summary text;

-- Drop old columns
ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS user_stack,
  DROP COLUMN IF EXISTS default_gifting_tone;
