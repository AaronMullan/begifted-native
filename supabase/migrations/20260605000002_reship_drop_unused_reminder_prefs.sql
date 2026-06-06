-- DEV-126: Re-ship the dead-reminder-column drop that was recorded but never run.
--
-- The original migration 20260509000001_drop_unused_reminder_prefs.sql was RECORDED
-- in supabase_migrations.schema_migrations but its DDL never executed against prod:
-- information_schema confirms reminder_days, reminder_2_weeks_before,
-- reminder_1_week_before, and reminder_day_of_event still exist on the live
-- user_preferences table. Because scripts/apply-migrations.mjs skips any version
-- already present in schema_migrations, re-merging the original file is a no-op.
-- This is a NEW version so CI will actually run it.
--
-- These columns are dead: the gift-generation cron (be-gifted repo) never read
-- them and the associated mobile UI was removed in the original DEV-30 PR.
-- DROP COLUMN IF EXISTS is idempotent and additive cleanup.

ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS reminder_days,
  DROP COLUMN IF EXISTS reminder_2_weeks_before,
  DROP COLUMN IF EXISTS reminder_1_week_before,
  DROP COLUMN IF EXISTS reminder_day_of_event;
