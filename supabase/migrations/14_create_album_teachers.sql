-- Create album_teachers table for teacher greetings
CREATE TABLE IF NOT EXISTS album_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_album_teachers_album_id 
  ON album_teachers(album_id);
  
CREATE INDEX IF NOT EXISTS idx_album_teachers_sort_order 
  ON album_teachers(album_id, sort_order);

-- Enable RLS
ALTER TABLE album_teachers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view teachers
CREATE POLICY "Anyone can view teachers"
  ON album_teachers FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Album owners/admins/global admins can insert
CREATE POLICY "Album owners can insert teachers"
  ON album_teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE created_by = auth.uid()
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );

-- Policy: Album owners/admins/global admins can update
CREATE POLICY "Album owners can update teachers"
  ON album_teachers FOR UPDATE
  TO authenticated
  USING (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE created_by = auth.uid()
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );

-- Policy: Album owners/admins/global admins can delete
CREATE POLICY "Album owners can delete teachers"
  ON album_teachers FOR DELETE
  TO authenticated
  USING (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE created_by = auth.uid()
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_album_teachers_updated_at
  BEFORE UPDATE ON album_teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
