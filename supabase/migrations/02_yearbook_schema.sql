-- ============================================================================
-- 02_yearbook_schema.sql
-- Consolidated schema for Yearbook specifics (Classes, Access, Storage)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CLEANUP DROPS (Ensure unused npm run devtables are removed)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.album_photos CASCADE;         -- Legacy photos table
DROP TABLE IF EXISTS public.album_class_students CASCADE; -- Legacy pre-filled list

-- ----------------------------------------------------------------------------
-- 1. ALBUM CLASSES
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
);

DROP POLICY IF EXISTS "Album owner/admin can manage classes" ON public.album_classes;
CREATE POLICY "Album owner/admin can manage classes" ON public.album_classes FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- ----------------------------------------------------------------------------
-- 2. ALBUM CLASS ACCESS (Member Profiles + Photos)
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
  date_of_birth text,
  video_url text, -- YouTube/Drive link
  
  -- Photos (JSONB Array of strings) - Max 4
  photos JSONB DEFAULT '[]'::jsonb,

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(class_id, user_id),
  CONSTRAINT check_max_4_photos CHECK (jsonb_array_length(photos) <= 4)
);

CREATE INDEX IF NOT EXISTS idx_album_class_access_user_id ON public.album_class_access(user_id);
CREATE INDEX IF NOT EXISTS idx_album_class_access_class_id ON public.album_class_access(class_id);
ALTER TABLE public.album_class_access ENABLE ROW LEVEL SECURITY;

-- Policies for Access (use SECURITY DEFINER helpers from 01 to avoid RLS recursion)
DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR (status = 'approved' AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()))
  OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "User Request Access" ON public.album_class_access;
CREATE POLICY "User Request Access" ON public.album_class_access FOR INSERT WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "User Update Own Profile" ON public.album_class_access;
CREATE POLICY "User Update Own Profile" ON public.album_class_access FOR UPDATE USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owner/Admin Manage Access" ON public.album_class_access;
CREATE POLICY "Owner/Admin Manage Access" ON public.album_class_access FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Trigger to protect status column (uses helpers to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.check_access_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = NEW.user_id THEN
       IF public.check_is_album_owner(NEW.album_id) THEN
         RETURN NEW;
       END IF;
       IF public.check_is_album_admin(NEW.album_id) THEN
         RETURN NEW;
       END IF;
       IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
         RETURN NEW;
       END IF;
       RAISE EXCEPTION 'Users cannot change status directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_protect_access_status ON public.album_class_access;
CREATE TRIGGER trigger_protect_access_status
  BEFORE UPDATE ON public.album_class_access
  FOR EACH ROW EXECUTE PROCEDURE public.check_access_status_update();

-- ----------------------------------------------------------------------------
-- 3. STORAGE BUCKET (album-photos)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'album-photos',
  'album-photos',
  true,
  20971520, -- 20MB (increased to support video)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow authenticated upload album-photos" ON storage.objects;
CREATE POLICY "Allow authenticated upload album-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'album-photos');
