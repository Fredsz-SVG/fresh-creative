-- Create album_teacher_photos table for multiple teacher photos
CREATE TABLE IF NOT EXISTS album_teacher_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES album_teachers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_album_teacher_photos_teacher_id 
  ON album_teacher_photos(teacher_id);
  
CREATE INDEX IF NOT EXISTS idx_album_teacher_photos_sort_order 
  ON album_teacher_photos(teacher_id, sort_order);

-- Enable RLS
ALTER TABLE album_teacher_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view teacher photos
CREATE POLICY "Anyone can view teacher photos"
  ON album_teacher_photos FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Album owners/admins/global admins can insert
CREATE POLICY "Album owners can insert teacher photos"
  ON album_teacher_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_global_admin()
    OR teacher_id IN (
      SELECT t.id FROM album_teachers t
      INNER JOIN albums a ON t.album_id = a.id
      WHERE a.user_id = auth.uid()
        OR a.id IN (
          SELECT album_id FROM album_members 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'owner')
        )
    )
  );

-- Policy: Album owners/admins/global admins can delete
CREATE POLICY "Album owners can delete teacher photos"
  ON album_teacher_photos FOR DELETE
  TO authenticated
  USING (
    public.check_is_global_admin()
    OR teacher_id IN (
      SELECT t.id FROM album_teachers t
      INNER JOIN albums a ON t.album_id = a.id
      WHERE a.user_id = auth.uid()
        OR a.id IN (
          SELECT album_id FROM album_members 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'owner')
        )
    )
  );

-- Add bio and video_url columns to album_teachers if not exists
ALTER TABLE album_teachers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE album_teachers ADD COLUMN IF NOT EXISTS video_url TEXT;
