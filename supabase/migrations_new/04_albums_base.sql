-- ============================================================================
-- 04_albums_base.sql
-- Core album system: albums, members, and invites
-- Tables: albums, album_members, album_invites
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ALBUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE album_type AS ENUM ('public', 'yearbook');
  CREATE TYPE album_status AS ENUM ('pending', 'approved', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- ALBUMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type album_type NOT NULL,
  status album_status,
  
  -- Yearbook-specific fields
  pricing_package_id text REFERENCES public.pricing_packages(id),
  school_name text,
  province_id text,
  province_name text,
  school_city text,
  kab_kota text,
  pic_name text,
  wa_e164 text,
  students_count integer,
  
  -- Content
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  cover_image_url text,
  cover_image_position text,
  cover_video_url text,
  description text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_type ON public.albums(type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp() 
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$;

DROP TRIGGER IF EXISTS set_timestamp ON public.albums;
CREATE TRIGGER set_timestamp 
  BEFORE UPDATE ON public.albums 
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Users can manage their own albums
DROP POLICY IF EXISTS "Users can manage own albums" ON public.albums;
CREATE POLICY "Users can manage own albums" ON public.albums 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Members can view albums they're part of
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
CREATE POLICY "Members can view albums" ON public.albums 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = albums.id AND m.user_id = auth.uid())
    OR (visibility = 'public')
  );

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (for RLS without recursion)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_is_album_owner(_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.albums WHERE id = _album_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.check_is_album_admin(_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_members 
    WHERE album_id = _album_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- ALBUM_MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_members (
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (album_id, user_id)
);

ALTER TABLE public.album_members ENABLE ROW LEVEL SECURITY;

-- Members can read their own membership
DROP POLICY IF EXISTS "Members read access" ON public.album_members;
CREATE POLICY "Members read access" ON public.album_members FOR SELECT USING (
  auth.uid() = user_id
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Users can join via invite (insert their own row)
DROP POLICY IF EXISTS "Self join" ON public.album_members;
CREATE POLICY "Self join" ON public.album_members 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owner/Admins can manage members
DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.album_members;
CREATE POLICY "Owner/Admin manage members" ON public.album_members FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- ----------------------------------------------------------------------------
-- ALBUM_INVITES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_album_invites_token ON public.album_invites(token);
ALTER TABLE public.album_invites ENABLE ROW LEVEL SECURITY;

-- Owners can manage invites
DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;
CREATE POLICY "Owners manage invites" ON public.album_invites FOR ALL USING (
  public.check_is_album_owner(album_id)
);

-- Public can read invites for validation
DROP POLICY IF EXISTS "Public read invites" ON public.album_invites;
CREATE POLICY "Public read invites" ON public.album_invites FOR SELECT USING (true);
