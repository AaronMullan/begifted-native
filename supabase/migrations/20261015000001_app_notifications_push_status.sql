-- Record what happened to each notification's push, so a push that never left
-- the server can be told apart from one that was delivered and ignored.
-- Written by be-gifted's push service (lib/services/push-notifications.ts):
--   pending   - row written, push not yet resolved (the add flow defers its
--               push to a coalesced send; a row stuck here never got one)
--   sent      - Expo accepted the message for at least one device
--   failed    - no device accepted it; push_error holds the Expo error code
--               or HTTP status
--   no_device - the user has no registered push token
--   disabled  - a deferred row whose user turned push off before it was sent
-- Users who already had push turned off get no row at all.
-- Rows written before this column existed stay NULL.

ALTER TABLE app_notifications
  ADD COLUMN IF NOT EXISTS push_status TEXT,
  ADD COLUMN IF NOT EXISTS push_error TEXT;

-- Carries the in-app row's ID from generation time to the deferred coalesced
-- push, which puts it in the push data and stamps the row's push_status.
ALTER TABLE pending_gift_pushes
  ADD COLUMN IF NOT EXISTS notification_id UUID;
