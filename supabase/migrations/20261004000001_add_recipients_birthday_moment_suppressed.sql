-- A known birthday gets a Birthday moment by default. True means the user
-- deleted that moment, so it must not come back on its own: not when the
-- birthday is edited, and not when the gift cron reaches the birthday. Without
-- this, "birthday known, moment never created" and "moment deliberately
-- deleted" look identical. Re-adding Birthday as a moment, or clearing the
-- birthday, sets it back to false.
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS birthday_moment_suppressed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN recipients.birthday_moment_suppressed IS
  'User deleted the Birthday moment. Keep the birthday as information but never recreate the moment automatically. Cleared when Birthday is re-added as a moment or the birthday is removed.';
