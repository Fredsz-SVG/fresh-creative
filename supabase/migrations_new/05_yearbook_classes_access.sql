-- ============================================================================
-- 05_yearbook_classes_access.sql
-- Yearbook class management and student access profiles
-- Tables: album_classes, album_class_access
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALBUM_CLASSES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  name text NOT NULL,
  password_hash text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(album_id, name)
);

CREATE INDEX IF NOT EXISTS idx_album_classes_album_id ON public.album_classes(album_id);
ALTER TABLE public.album_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Album owner and members can read classes" ON public.album_classes;
CREATE POLICY "Album owner and members can read classes" ON public.album_classes FOR SELECT USING (
  public.check_is_album_owner(album_id)
  OR EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_classes.album_id AND m.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.album_class_access a WHERE a.album_id = album_classes.album_id AND a.user_id = auth.uid() AND a.status = 'approved')
);

DROP POLICY IF EXISTS "Album owner/admin can manage classes" ON public.album_classes;
CREATE POLICY "Album owner/admin can manage classes" ON public.album_classes FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- ----------------------------------------------------------------------------
-- ALBUM_CLASS_ACCESS TABLE (Student Profiles + Photos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_class_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.album_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile Data
  student_name text NOT NULL,
  email text,
  instagram text,
  message text,
  date_of_birth date,
  video_url text,
  
  -- Photos Array (JSONB) - Max 4 photos
  photos JSONB DEFAULT '[]'::jsonb,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(album_id, class_id, user_id),
  CONSTRAINT check_max_4_photos CHECK (jsonb_array_length(photos) <= 4)
);

CREATE INDEX IF NOT EXISTS idx_album_class_access_user_id ON public.album_class_access(user_id);
CREATE INDEX IF NOT EXISTS idx_album_class_access_class_id ON public.album_class_access(class_id);
CREATE INDEX IF NOT EXISTS idx_album_class_access_album_id ON public.album_class_access(album_id);
ALTER TABLE public.album_class_access ENABLE ROW LEVEL SECURITY;

-- Read: Owner, Admin, approved members, or self
DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR (status = 'approved' AND EXISTS (
    SELECT 1 FROM public.album_members m 
    WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()
  ))
  OR (auth.uid() = user_id)
);

-- Users can update their own approved profiles
DROP POLICY IF EXISTS "User Update Own Profile" ON public.album_class_access;
CREATE POLICY "User Update Own Profile" ON public.album_class_access FOR UPDATE USING (
  auth.uid() = user_id AND status = 'approved'
) WITH CHECK (
  auth.uid() = user_id AND status = 'approved'
);

-- Owner/Admin can manage all access records
DROP POLICY IF EXISTS "Owner/Admin Manage Access" ON public.album_class_access;
CREATE POLICY "Owner/Admin Manage Access" ON public.album_class_access FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Trigger to protect status changes
CREATE OR REPLACE FUNCTION public.check_access_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only owner/admin can change status
    IF NOT (public.check_is_album_owner(NEW.album_id) OR public.check_is_album_admin(NEW.album_id)) THEN
      -- Allow user to change rejected → pending (re-registration)
      IF auth.uid() = NEW.user_id AND OLD.status = 'rejected' AND NEW.status = 'pending' THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Only album owner/admin can change access status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_access_status ON public.album_class_access;
CREATE TRIGGER trigger_protect_access_status
  BEFORE UPDATE ON public.album_class_access
  FOR EACH ROW EXECUTE PROCEDURE public.check_access_status_update();
