-- DEV-30: Drop unused reminder preference columns from user_preferences.
-- These columns were never read by the gift-generation cron in the be-gifted
-- repo, which uses a hardcoded 11-day lookahead. The associated mobile UI
-- (Default Reminder Time dropdown, the three reminder boolean toggles) is
-- being removed in the same PR. Shipping-aware per-occasion reminders are
-- planned as a V2 feature; this clears the slate.

ALTER TABLE user_preferences
  DROP COLUMN IF EXISTS reminder_days,
  DROP COLUMN IF EXISTS reminder_2_weeks_before,
  DROP COLUMN IF EXISTS reminder_1_week_before,
  DROP COLUMN IF EXISTS reminder_day_of_event;
