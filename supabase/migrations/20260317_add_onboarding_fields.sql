-- Add onboarding and identity fields to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_description text,
  ADD COLUMN IF NOT EXISTS gifting_style_text text;
