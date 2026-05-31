-- DEV-103: Configurable gift-notification lead time.
-- The gift-generation cron in the sibling be-gifted repo used a hardcoded 11-day
-- lookahead, which was too short to order + ship a gift in time. Replace it with a
-- per-user preference. NOT NULL DEFAULT 21 backfills every existing row to a 3-week
-- lead so existing users get the new default until they change it; new users default
-- to 21 as well. Users can pick 14 / 21 / 28 (or a free-form count) in the mobile
-- Settings -> Notifications screen.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notification_lead_days integer NOT NULL DEFAULT 21;
