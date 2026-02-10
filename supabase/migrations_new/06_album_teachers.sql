-- ============================================================================
-- 06_album_teachers.sql
-- Album teachers and teacher photos (greetings/sambutan)
-- Tables: album_teachers, album_teacher_photos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALBUM_TEACHERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  message text,
  photo_url text,
  video_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_album_teachers_album_id ON public.album_teachers(album_id);
CREATE INDEX IF NOT EXISTS idx_album_teachers_sort_order ON public.album_teachers(album_id, sort_order);
ALTER TABLE public.album_teachers ENABLE ROW LEVEL SECURITY;

-- Anyone can view teachers
DROP POLICY IF EXISTS "Anyone can view teachers" ON public.album_teachers;
CREATE POLICY "Anyone can view teachers" ON public.album_teachers 
  FOR SELECT USING (true);

-- Album owners/admins can manage teachers
DROP POLICY IF EXISTS "Album owners manage teachers" ON public.album_teachers;
CREATE POLICY "Album owners manage teachers" ON public.album_teachers 
  FOR ALL TO authenticated USING (
    public.check_is_global_admin()
    OR public.check_is_album_owner(album_id)
    OR public.check_is_album_admin(album_id)
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_album_teachers_updated_at ON public.album_teachers;
CREATE TRIGGER update_album_teachers_updated_at
  BEFORE UPDATE ON public.album_teachers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- ----------------------------------------------------------------------------
-- ALBUM_TEACHER_PHOTOS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_teacher_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.album_teachers(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_teacher_photos_teacher_id ON public.album_teacher_photos(teacher_id);
CREATE INDEX IF NOT EXISTS idx_album_teacher_photos_sort_order ON public.album_teacher_photos(teacher_id, sort_order);
ALTER TABLE public.album_teacher_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view teacher photos
DROP POLICY IF EXISTS "Anyone can view teacher photos" ON public.album_teacher_photos;
CREATE POLICY "Anyone can view teacher photos" ON public.album_teacher_photos 
  FOR SELECT USING (true);

-- Album owners/admins can manage teacher photos
DROP POLICY IF EXISTS "Album owners manage teacher photos" ON public.album_teacher_photos;
CREATE POLICY "Album owners manage teacher photos" ON public.album_teacher_photos 
  FOR ALL TO authenticated USING (
    public.check_is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.album_teachers t
      INNER JOIN public.albums a ON t.album_id = a.id
      WHERE t.id = album_teacher_photos.teacher_id
        AND (a.user_id = auth.uid() OR public.check_is_album_admin(a.id))
    )
  );
