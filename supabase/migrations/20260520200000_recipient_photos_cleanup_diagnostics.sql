-- Clean up the in-place diagnostics used to debug the storage RLS rejection
-- (now worked around via the upload-recipient-photo edge function), and
-- restore a tightened INSERT policy on storage.objects for recipient-photos.
--
-- Since uploads now go through service_role inside the edge function, this
-- policy doesn't gate the app's photo uploads. It is restored to a scoped
-- form so that any direct client INSERT (which would bypass our intended
-- flow) would at least be checked against the caller's user_id.

DROP TRIGGER IF EXISTS _storage_insert_diag_trg ON storage.objects;
DROP FUNCTION IF EXISTS public._storage_insert_diag_fn();
DROP TABLE IF EXISTS public._storage_insert_diag;

DROP POLICY IF EXISTS "Users can upload own recipient photos" ON storage.objects;

CREATE POLICY "Users can upload own recipient photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipient-photos'
  AND (select auth.jwt()->>'sub') = (storage.foldername(name))[1]
);
