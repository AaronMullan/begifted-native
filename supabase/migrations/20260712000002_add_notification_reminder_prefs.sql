-- v4 Notifications screen (DEV-259): "Gift & Occasion Reminders" toggle and
-- "How Many Reminders?" (1/2/3) selector need dedicated preference columns.
-- Default reminder_count of 2 matches the v4 comp's selected state; the
-- gift-generation cron consumes these in a follow-up.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS occasion_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 2;
