-- Fix RLS policies for album_teachers to use correct column name
-- The albums table uses 'user_id' not 'created_by'

-- Drop existing policies
DROP POLICY IF EXISTS "Album owners can insert teachers" ON album_teachers;
DROP POLICY IF EXISTS "Album owners can update teachers" ON album_teachers;
DROP POLICY IF EXISTS "Album owners can delete teachers" ON album_teachers;

-- Recreate with correct column reference (user_id)
CREATE POLICY "Album owners can insert teachers"
  ON album_teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE user_id = auth.uid()  -- FIXED: was created_by
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "Album owners can update teachers"
  ON album_teachers FOR UPDATE
  TO authenticated
  USING (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE user_id = auth.uid()  -- FIXED: was created_by
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );

CREATE POLICY "Album owners can delete teachers"
  ON album_teachers FOR DELETE
  TO authenticated
  USING (
    public.check_is_global_admin()
    OR album_id IN (
      SELECT id FROM albums 
      WHERE user_id = auth.uid()  -- FIXED: was created_by
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );
