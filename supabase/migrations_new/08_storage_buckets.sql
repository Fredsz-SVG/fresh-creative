-- ============================================================================
-- 08_storage_buckets.sql
-- Storage bucket configuration for file uploads
-- Buckets: user_files, album-photos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USER_FILES BUCKET
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user_files',
  'user_files',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read
DROP POLICY IF EXISTS "User files public read" ON storage.objects;
CREATE POLICY "User files public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'user_files');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user_files' AND auth.uid() = owner
  );

-- Allow users to update their own files
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user_files' AND auth.uid() = owner
  );

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user_files' AND auth.uid() = owner
  );

-- ----------------------------------------------------------------------------
-- ALBUM-PHOTOS BUCKET
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'album-photos',
  'album-photos',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public read
DROP POLICY IF EXISTS "Album photos public read" ON storage.objects;
CREATE POLICY "Album photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'album-photos');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated can upload album photos" ON storage.objects;
CREATE POLICY "Authenticated can upload album photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'album-photos');

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Authenticated can update album photos" ON storage.objects;
CREATE POLICY "Authenticated can update album photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'album-photos');

-- Allow authenticated users to delete
DROP POLICY IF EXISTS "Authenticated can delete album photos" ON storage.objects;
CREATE POLICY "Authenticated can delete album photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'album-photos');
