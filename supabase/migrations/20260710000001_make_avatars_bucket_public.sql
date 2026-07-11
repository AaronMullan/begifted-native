-- Profile avatars are served by public URL (same as recipient-photos), so the
-- avatars bucket must be public for getPublicUrl() links to resolve. The bucket
-- already exists (created out-of-band); this only flips its visibility.
-- Idempotent: safe to re-run.
update storage.buckets set public = true where id = 'avatars';
