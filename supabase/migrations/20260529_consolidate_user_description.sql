-- DEV-97: consolidate user_preferences.gifting_style_text into user_description.
-- Settings used to write the editable self-description into gifting_style_text
-- while onboarding wrote the original answer to user_description. Both fed the
-- same downstream surfaces, so we collapse to a single source of truth.
--
-- Coalesce direction: gifting_style_text is the user's current edit (Settings
-- writes it on every save), so when it is set it wins over user_description.

UPDATE user_preferences
SET user_description = gifting_style_text,
    updated_at = now()
WHERE gifting_style_text IS NOT NULL
  AND gifting_style_text IS DISTINCT FROM user_description;

ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS gifting_style_text;
