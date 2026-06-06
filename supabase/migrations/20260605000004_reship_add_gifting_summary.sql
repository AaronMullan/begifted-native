-- DEV-126: Re-ship the gifting_summary column add that was recorded but never run.
--
-- Surfaced by the DEV-126 audit. The original migration
-- 20260327000001_open_ended_preferences.sql is RECORDED in
-- supabase_migrations.schema_migrations, but only partially took effect on prod:
-- its two DROP COLUMN statements (user_stack, default_gifting_tone) applied, yet
-- its `ADD COLUMN gifting_summary` never executed -- information_schema confirms
-- gifting_summary does not exist on the live user_preferences table. Because
-- scripts/apply-migrations.mjs skips any version already present in
-- schema_migrations, re-merging the original file is a no-op. This is a NEW
-- version so CI will actually run it.
--
-- The column belongs to the (not-yet-shipped) open-ended-preferences redesign and
-- is not yet read/written by app code. ADD COLUMN IF NOT EXISTS is idempotent and
-- purely additive (nullable, no default), so this brings prod in line with the
-- committed migration with no data-loss risk.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gifting_summary text;
