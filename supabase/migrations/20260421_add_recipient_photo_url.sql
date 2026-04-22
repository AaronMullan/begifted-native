-- Add photo_url column to store uploaded contact/profile images
ALTER TABLE recipients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create storage bucket for recipient photos (public so image URLs work without auth tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipient-photos',
  'recipient-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload to their own folder (path must start with their uid)
CREATE POLICY "Users can upload own recipient photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipient-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users may replace/update their own photos
CREATE POLICY "Users can update own recipient photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipient-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users may delete their own photos
CREATE POLICY "Users can delete own recipient photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipient-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
