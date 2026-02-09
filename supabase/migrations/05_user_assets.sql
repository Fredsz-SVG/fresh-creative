-- 05_user_assets.sql
-- Table for User Assets (File Saya) with generic file storage
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON public.user_assets(user_id);

ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own assets" ON public.user_assets;
CREATE POLICY "Users can manage own assets" ON public.user_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage Bucket: user_files
-- ==========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_files', 'user_files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Allow public access to read (or authenticated? The user request implies it's for them, but usually files are assets used elsewhere too. 'public' bucket helps.)
DROP POLICY IF EXISTS "Assets Public Access" ON storage.objects;
CREATE POLICY "Assets Public Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'user_files' ); 

DROP POLICY IF EXISTS "Users can upload own assets" ON storage.objects;
CREATE POLICY "Users can upload own assets" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'user_files' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can update own assets" ON storage.objects;
CREATE POLICY "Users can update own assets" ON storage.objects FOR UPDATE
USING ( bucket_id = 'user_files' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can delete own assets" ON storage.objects;
CREATE POLICY "Users can delete own assets" ON storage.objects FOR DELETE
USING ( bucket_id = 'user_files' AND auth.uid() = owner );
