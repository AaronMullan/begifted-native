-- DEV-121: Verify/ship the 21-day default for notification lead time.
--
-- The earlier migration 20260531000001_add_notification_lead_days.sql was RECORDED
-- in supabase_migrations.schema_migrations but its DDL never executed against prod:
-- information_schema confirms `notification_lead_days` does not exist on the live
-- user_preferences table. Because scripts/apply-migrations.mjs skips any version
-- already present in schema_migrations, re-merging that file is a no-op. This is a
-- NEW version so CI will actually run it.
--
-- ADD COLUMN IF NOT EXISTS ... NOT NULL DEFAULT 21 is idempotent and additive:
--   * new users default to 21 (the column default applies when the
--     ensure_user_preferences trigger inserts a row without this field), and
--   * every existing row is backfilled to 21 — the lead-time pref never existed
--     before, so no per-user value is overwritten and all other preference
--     columns are left untouched.
-- Users can later pick 7-60 days (presets 14 / 21 / 28) in Settings -> Notifications.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_lead_days integer NOT NULL DEFAULT 21;
