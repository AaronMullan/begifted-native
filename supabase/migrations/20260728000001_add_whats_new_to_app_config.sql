-- Per-update "What's New" content for the OTA update card. Shape:
--   { "date": "YYYY-MM-DD", "sections": [{ "title": "...", "body": "..." }] }
-- Null (or empty sections) makes the card fall back to generic copy.
ALTER TABLE app_config
  ADD COLUMN IF NOT EXISTS whats_new jsonb;
