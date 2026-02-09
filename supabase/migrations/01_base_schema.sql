-- ============================================================================
-- 01_base_schema.sql
-- Consolidated schema for Auth, Shared Refs, Leads, Pricing, and Albums
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTH & USERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own row" ON public.users;
CREATE POLICY "Users can read own row" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own row" ON public.users;
CREATE POLICY "Users can update own row" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'user'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- Login OTPs (Magic Link helper)
CREATE TABLE IF NOT EXISTS public.login_otps (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);
CREATE INDEX IF NOT EXISTS idx_login_otps_expires_at ON public.login_otps(expires_at);
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own login OTP" ON public.login_otps;
CREATE POLICY "Users can manage own login OTP" ON public.login_otps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. SHARED REFERENCES (Provinces & Cities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_provinces (
  id text NOT NULL,
  name text NOT NULL,
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.ref_cities (
  id text NOT NULL,
  province_id text NOT NULL REFERENCES public.ref_provinces(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'kota' CHECK (kind IN ('kota', 'kabupaten')),
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_ref_cities_province_id ON public.ref_cities(province_id);

-- Seed Provinces (Subset example, usually full list via migration)
INSERT INTO public.ref_provinces (id, name) VALUES
  ('11', 'Aceh'), ('31', 'DKI Jakarta'), ('32', 'Jawa Barat'), ('33', 'Jawa Tengah'), ('34', 'DI Yogyakarta'), ('35', 'Jawa Timur'), ('36', 'Banten'), ('51', 'Bali')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ----------------------------------------------------------------------------
-- 3. PRICING & LEADS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_per_student integer NOT NULL,
  min_students integer NOT NULL,
  features text[] NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.pricing_packages (id, name, price_per_student, min_students, features) VALUES
  ('basic', 'Paket Basic', 85000, 100, ARRAY['Cover standar', '24 halaman', 'Foto kelas + individu', 'Soft copy']),
  ('standard', 'Paket Standard', 120000, 100, ARRAY['Cover pilihan', '32 halaman', 'Foto kelas + individu', 'Soft copy', 'Konsultasi 1x']),
  ('premium', 'Paket Premium', 165000, 80, ARRAY['Cover custom', '40 halaman', 'Semua foto + layout eksklusif', 'Soft copy + hard cover', 'Konsultasi 2x'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pricing" ON public.pricing_packages;
CREATE POLICY "Public read pricing" ON public.pricing_packages FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL,
  province_id text, province_name text,
  school_city text NOT NULL, kab_kota text NOT NULL,
  pic_name text, wa_e164 text NOT NULL,
  students_count integer, source text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'suspected_bot', 'contacted', 'converted', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pricing_package_id text REFERENCES public.pricing_packages(id),
  total_estimated_price integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY; -- Default deny if no policies

-- ----------------------------------------------------------------------------
-- 4. ALBUMS CORE
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE album_type AS ENUM ('public', 'yearbook');
  CREATE TYPE album_status AS ENUM ('pending', 'approved', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type album_type NOT NULL,
  status album_status,
  
  -- Leads Link (Yearbook only)
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  pricing_package_id text REFERENCES public.pricing_packages(id),
  
  -- Visibility & Content
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  cover_image_url text,
  cover_image_position text,
  cover_video_url text,
  description text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT check_album_properties CHECK (
    (type = 'yearbook'::album_type) -- Strict checks relaxed for flexibility (original mig 04 had checks but 12 relaxed them)
    OR (type = 'public'::album_type)
  )
);
-- Note on check_album_properties: original required lead_id but '12_albums_allow_null_lead_id.sql' removed it. Strict checks removed here.

CREATE INDEX IF NOT EXISTS idx_albums_user_id ON public.albums(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_type ON public.albums(type);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.albums;
CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Album Policies (Aggregated)
DROP POLICY IF EXISTS "Users can manage own albums" ON public.albums;
CREATE POLICY "Users can manage own albums" ON public.albums FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. ALBUM MEMBERS & INVITES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.album_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')), -- Added role for invite
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
-- Migration Patch: Ensure role exists if table already existed
ALTER TABLE public.album_invites ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'));

CREATE INDEX IF NOT EXISTS idx_album_invites_token ON public.album_invites(token);
ALTER TABLE public.album_invites ENABLE ROW LEVEL SECURITY;

-- Members
CREATE TABLE IF NOT EXISTS public.album_members (
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')), -- Added role for member
  PRIMARY KEY (album_id, user_id)
);
-- Migration Patch: Ensure role exists if table already existed
ALTER TABLE public.album_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'));

ALTER TABLE public.album_members ENABLE ROW LEVEL SECURITY;

-- Helper functions to avoid RLS recursion (SECURITY DEFINER = bypass RLS when checking)
CREATE OR REPLACE FUNCTION public.check_is_album_owner(_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.albums WHERE id = _album_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.check_is_album_admin(_album_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.album_members WHERE album_id = _album_id AND user_id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;
CREATE POLICY "Owners manage invites" ON public.album_invites FOR ALL USING (
  public.check_is_album_owner(album_id)
);
DROP POLICY IF EXISTS "Public read invites" ON public.album_invites;
CREATE POLICY "Public read invites" ON public.album_invites FOR SELECT USING (true); -- For token validation

DROP POLICY IF EXISTS "Members read access" ON public.album_members;
CREATE POLICY "Members read access" ON public.album_members FOR SELECT USING (
  auth.uid() = user_id
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

DROP POLICY IF EXISTS "Self join" ON public.album_members;
CREATE POLICY "Self join" ON public.album_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.album_members;
CREATE POLICY "Owner/Admin manage members" ON public.album_members FOR ALL USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Add READ Access to Albums for Members (RLS)
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = albums.id AND m.user_id = auth.uid())
  OR (visibility = 'public') -- public access if visibility public
);
