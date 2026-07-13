-- Seed the real published legal documents (Termly-hosted, public URLs from
-- DEV-141) and retire the DEV-142 placeholders. Idempotent: deactivate
-- anything that isn't the current pair, then upsert the pair as active — this
-- ordering keeps the one-active-per-type partial unique index satisfied.
-- Version numbers are Termly's document versions. content_hash stays NULL:
-- Termly is the canonical content store and auto-updates the hosted text, so
-- a locally computed hash would silently go stale.

UPDATE legal_document_versions
SET is_active = false
WHERE is_active
  AND NOT (document_type = 'terms' AND version = '6')
  AND NOT (document_type = 'privacy_policy' AND version = '8');

INSERT INTO legal_document_versions
  (document_type, version, effective_date, url, content_hash, is_active)
VALUES
  (
    'terms',
    '6',
    '2026-07-13',
    'https://app.termly.io/policy-viewer/policy.html?policyUUID=37fbf082-c52f-475a-acf7-15b83e27e1d8',
    NULL,
    true
  ),
  (
    'privacy_policy',
    '8',
    '2026-07-13',
    'https://app.termly.io/policy-viewer/policy.html?policyUUID=8a5aa3cf-05d4-4331-98d7-5029501b30d4',
    NULL,
    true
  )
ON CONFLICT (document_type, version) DO UPDATE
  SET url = EXCLUDED.url,
      effective_date = EXCLUDED.effective_date,
      is_active = true;
