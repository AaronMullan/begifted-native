-- DEV-126: Re-ship the gifting_style_text -> user_description consolidation that
-- was recorded but never run.
--
-- The original migration 20260529000001_consolidate_user_description.sql was
-- RECORDED in supabase_migrations.schema_migrations but its DDL never executed
-- against prod: information_schema confirms gifting_style_text still exists on the
-- live user_preferences table and the consolidation UPDATE never ran. Because
-- scripts/apply-migrations.mjs skips any version already present in
-- schema_migrations, re-merging the original file is a no-op. This is a NEW
-- version so CI will actually run it.
--
-- DATA SAFETY: of 14 prod rows, 2 have a non-null gifting_style_text and 1 of
-- those differs from user_description. The UPDATE below MUST run before the drop
-- so that the user's current edit (Settings wrote it to gifting_style_text on
-- every save) is preserved into user_description rather than lost.
--
-- Coalesce direction: gifting_style_text is the user's current edit, so when it
-- is set it wins over user_description.

UPDATE user_preferences
SET user_description = gifting_style_text,
    updated_at = now()
WHERE gifting_style_text IS NOT NULL
  AND gifting_style_text IS DISTINCT FROM user_description;

ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS gifting_style_text;
