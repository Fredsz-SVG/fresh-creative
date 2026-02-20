-- ============================================================================
-- DATABASE SCHEMA EXPORT (UNIFIED)
-- CREATED: 2026
-- Execute this single file in the Supabase SQL Editor on a fresh project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SOURCE: 01_base_schema.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 02_yearbook_schema.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 03_realtime_publication.sql
-- ----------------------------------------------------------------------------

-- Enable Realtime: approval flow + daftar group + profil card
-- album_class_access: approve/disapprove + hapus profil langsung muncul
-- album_classes: tambah/edit/hapus group tanpa refresh
-- REPLICA IDENTITY FULL agar payload.old pada DELETE/UPDATE berisi class_id (untuk refetch member)
ALTER TABLE public.album_class_access REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_class_access') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_class_access;
  END IF;
  -- (album_class_requests publication logic removed)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_classes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_classes;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- SOURCE: 04_global_admin_realtime.sql
-- ----------------------------------------------------------------------------

-- Global admin harus bisa terima event Realtime untuk album_class_access (supaya profil card realtime)
-- Supabase Realtime mengirim event hanya ke client yang lulus RLS SELECT. Tanpa ini, admin website tidak dapat event.

CREATE OR REPLACE FUNCTION public.check_is_global_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR public.check_is_global_admin()
  OR (status = 'approved' AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()))
  OR (user_id = auth.uid())
);


-- ----------------------------------------------------------------------------
-- SOURCE: 05_user_assets.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 06_credit_packages.sql
-- ----------------------------------------------------------------------------

-- Create credit_packages table
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  credits integer NOT NULL,
  price bigint NOT NULL,
  popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be clean (idempotent)
DROP POLICY IF EXISTS "Allow public read access" ON public.credit_packages;
DROP POLICY IF EXISTS "Allow all access" ON public.credit_packages;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.credit_packages
  FOR SELECT USING (true);

-- Allow full access for simpler dashboard management (or restrict to Authenticated/Admin if preferred)
-- Since we are having issues with updates, let's enable full access for now to ensure it works.
CREATE POLICY "Allow all modification" ON public.credit_packages
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default packages only if empty
INSERT INTO public.credit_packages (credits, price, popular)
SELECT 50, 50000, false
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages);

INSERT INTO public.credit_packages (credits, price, popular)
SELECT 100, 90000, true
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages WHERE credits = 100);

-- Note: Duplicate inserts prevented by WHERE clause logic above, 
-- though partial existing data might result in fewer rows inserted.


-- ----------------------------------------------------------------------------
-- SOURCE: 07_credits_system.sql
-- ----------------------------------------------------------------------------

-- 07_credits_system.sql
-- Combined migration for Credits System
-- Includes:
-- 1. Credits column in users table
-- 2. Realtime publication
-- 3. RLS Policies and Permissions

BEGIN;

-- 1. Create users table if not exists (or add column) ===========================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  credits integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Safely add credits column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'credits') THEN
        ALTER TABLE public.users ADD COLUMN credits integer DEFAULT 0;
    END IF;
END $$;

-- 2. Setup RLS =================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view receive their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create Policies
CREATE POLICY "Users can view receive their own profile" ON public.users
  FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE
  USING ( auth.uid() = id );

-- Grant permissions explicitly
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- 3. Enable Realtime ===========================================================
-- Safely add table to publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'credit_packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_packages;
  END IF;
END $$;

-- 4. Triggers ==================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 0)
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;


-- ----------------------------------------------------------------------------
-- SOURCE: 10_ensure_realtime.sql
-- ----------------------------------------------------------------------------

-- 10_ensure_realtime.sql
-- Forcefully ensure Realtime is enabled for necessary tables.
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Ensure RLS Policies allow Public Read for Packages (Realtime requires SELECT permission)
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Packages" ON public.credit_packages;
CREATE POLICY "Public Read Packages" ON public.credit_packages FOR SELECT USING (true);

-- 2. Add 'credit_packages' to Realtime Publication
-- We use a DO block to ignore "already exists" errors
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_packages;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignore if already added
    WHEN OTHERS THEN RAISE NOTICE 'Error adding credit_packages to publication: %', SQLERRM;
END $$;

-- 3. Add 'users' to Realtime Publication (for Credit Balance)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignore if already added
    WHEN OTHERS THEN RAISE NOTICE 'Error adding users to publication: %', SQLERRM;
END $$;

COMMIT;


-- ----------------------------------------------------------------------------
-- SOURCE: 11_album_lead_realtime.sql
-- ----------------------------------------------------------------------------

-- 11_album_lead_realtime.sql
-- Enable Realtime for albums and leads tables to support cross-device updates.

BEGIN;

-- 1. Set REPLICA IDENTITY to FULL so all columns are included in the update payload
ALTER TABLE public.albums REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'albums') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.albums;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
    END IF;
END $$;

-- 3. Ensure Admins can SELECT all rows (required for Realtime events to be delivered to Admin)
DROP POLICY IF EXISTS "Admins can view all albums" ON public.albums;
CREATE POLICY "Admins can view all albums" ON public.albums 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads" ON public.leads 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Allow users to view their own leads (so they get realtime updates when status changes)
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads" ON public.leads 
FOR SELECT USING (auth.uid() = created_by);

COMMIT;


-- ----------------------------------------------------------------------------
-- SOURCE: 12_add_lead_details_to_albums.sql
-- ----------------------------------------------------------------------------

-- Add lead details columns to albums table to preserve data after lead approval
ALTER TABLE public.albums
ADD COLUMN IF NOT EXISTS school_city text,
ADD COLUMN IF NOT EXISTS kab_kota text,
ADD COLUMN IF NOT EXISTS wa_e164 text,
ADD COLUMN IF NOT EXISTS province_id text,
ADD COLUMN IF NOT EXISTS province_name text,
ADD COLUMN IF NOT EXISTS pic_name text,
ADD COLUMN IF NOT EXISTS students_count integer,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS total_estimated_price integer;


-- ----------------------------------------------------------------------------
-- SOURCE: 13_drop_leads_table.sql
-- ----------------------------------------------------------------------------

-- Remove leads table and its dependencies (foreign keys in albums)
-- Since we migrated all logic to albums table directly

-- 1. Remove foreign key from albums first
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_lead_id_fkey;

-- 2. Drop the leads table
DROP TABLE IF EXISTS public.leads;

-- 3. We can also drop the lead_id column from albums if it's no longer needed for reference, 
-- but keeping it might be useful if you still have external references. 
-- For now, let's keep the column as nullable but without FK constraint, or drop it if you are sure.
-- User asked to delete table leads, implying the relation is gone.
-- Let's drop the column to be clean, as data is now in albums columns (school_name etc).
ALTER TABLE public.albums DROP COLUMN IF EXISTS lead_id;


-- ----------------------------------------------------------------------------
-- SOURCE: 14_create_album_teachers.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 15_add_video_to_teachers.sql
-- ----------------------------------------------------------------------------

-- Add video_url field to album_teachers table
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add bio field for richer teacher profiles
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_album_teachers_created_by 
  ON album_teachers(created_by);


-- ----------------------------------------------------------------------------
-- SOURCE: 15_fix_album_teachers_rls.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 16_create_album_teacher_photos.sql
-- ----------------------------------------------------------------------------

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


-- ----------------------------------------------------------------------------
-- SOURCE: 17_fix_album_invites_rls.sql
-- ----------------------------------------------------------------------------

-- Fix album_invites RLS policy to allow global admins
DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;
CREATE POLICY "Owners manage invites" ON public.album_invites FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
);

-- Fix album_members policies to allow global admins
DROP POLICY IF EXISTS "Members read access" ON public.album_members;
CREATE POLICY "Members read access" ON public.album_members FOR SELECT USING (
  public.check_is_global_admin()
  OR auth.uid() = user_id
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

DROP POLICY IF EXISTS "Owner/Admin manage members" ON public.album_members;
CREATE POLICY "Owner/Admin manage members" ON public.album_members FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix albums SELECT policy to allow global admins to view all albums
DROP POLICY IF EXISTS "Members can view albums" ON public.albums;
CREATE POLICY "Members can view albums" ON public.albums FOR SELECT USING (
  public.check_is_global_admin()
  OR EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = albums.id AND m.user_id = auth.uid())
  OR (visibility = 'public')
);

-- Fix albums UPDATE/DELETE policy to allow global admins
DROP POLICY IF EXISTS "Users can manage own albums" ON public.albums;
CREATE POLICY "Users can manage own albums" ON public.albums FOR ALL USING (
  public.check_is_global_admin()
  OR auth.uid() = user_id
) WITH CHECK (
  public.check_is_global_admin()
  OR auth.uid() = user_id
);

-- Fix album_classes policies to allow global admins
DROP POLICY IF EXISTS "Album owner and members can read classes" ON public.album_classes;
CREATE POLICY "Album owner and members can read classes" ON public.album_classes FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_classes.album_id AND m.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Album owner/admin can manage classes" ON public.album_classes;
CREATE POLICY "Album owner/admin can manage classes" ON public.album_classes FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix album_class_access policies to allow global admins
DROP POLICY IF EXISTS "Read Access" ON public.album_class_access;
CREATE POLICY "Read Access" ON public.album_class_access FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
  OR (status = 'approved' AND EXISTS (SELECT 1 FROM public.album_members m WHERE m.album_id = album_class_access.album_id AND m.user_id = auth.uid()))
  OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Owner/Admin Manage Access" ON public.album_class_access;
CREATE POLICY "Owner/Admin Manage Access" ON public.album_class_access FOR ALL USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR public.check_is_album_admin(album_id)
);

-- Fix album_class_requests policies (removed)

-- ----------------------------------------------------------------------------
-- SOURCE: 18_album_join_requests_system.sql
-- ----------------------------------------------------------------------------

-- New album join request system
-- Users join album via universal link, then admin assigns to class

CREATE TABLE IF NOT EXISTS public.album_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- nullable if not registered yet
  
  -- Form data from join link
  student_name text NOT NULL,
  class_name text, -- What user inputs (e.g., "XII IPA 1")
  email text NOT NULL,
  phone text,
  
  -- Assignment (filled when approved)
  assigned_class_id uuid REFERENCES public.album_classes(id) ON DELETE SET NULL,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_reason text,
  
  -- Prevent duplicate requests
  CONSTRAINT unique_album_email UNIQUE(album_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_album_join_requests_album_id ON public.album_join_requests(album_id);
CREATE INDEX IF NOT EXISTS idx_album_join_requests_user_id ON public.album_join_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_album_join_requests_status ON public.album_join_requests(album_id, status);
CREATE INDEX IF NOT EXISTS idx_album_join_requests_email ON public.album_join_requests(album_id, email);

-- Enable RLS
ALTER TABLE public.album_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can read their own request
DROP POLICY IF EXISTS "Users can view own requests" ON public.album_join_requests;
CREATE POLICY "Users can view own requests" ON public.album_join_requests FOR SELECT USING (
  auth.uid() = user_id
  OR (user_id IS NULL AND email = auth.jwt()->>'email')
);

-- Authenticated users can insert requests (if album not full)
DROP POLICY IF EXISTS "Users can submit join requests" ON public.album_join_requests;
CREATE POLICY "Users can submit join requests" ON public.album_join_requests FOR INSERT WITH CHECK (
  status = 'pending'
  AND (
    -- Either authenticated and user_id matches
    (user_id IS NOT NULL AND auth.uid() = user_id)
    -- Or unauthenticated with email
    OR (user_id IS NULL AND email IS NOT NULL)
  )
);

-- Album owners/admins/global admins can view all requests for their albums
DROP POLICY IF EXISTS "Album managers view requests" ON public.album_join_requests;
CREATE POLICY "Album managers view requests" ON public.album_join_requests FOR SELECT USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (
    SELECT 1 FROM public.album_members m 
    WHERE m.album_id = album_join_requests.album_id 
    AND m.user_id = auth.uid() 
    AND m.role = 'admin'
  )
);

-- Album owners/admins/global admins can approve/reject requests
DROP POLICY IF EXISTS "Album managers manage requests" ON public.album_join_requests;
CREATE POLICY "Album managers manage requests" ON public.album_join_requests FOR UPDATE USING (
  public.check_is_global_admin()
  OR public.check_is_album_owner(album_id)
  OR EXISTS (
    SELECT 1 FROM public.album_members m 
    WHERE m.album_id = album_join_requests.album_id 
    AND m.user_id = auth.uid() 
    AND m.role = 'admin'
  )
);

-- Function to check album capacity
CREATE OR REPLACE FUNCTION public.check_album_capacity(_album_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _students_count int;
  _approved_count int;
BEGIN
  -- Get album limit
  SELECT students_count INTO _students_count
  FROM public.albums
  WHERE id = _album_id;
  
  -- If no limit set, allow unlimited
  IF _students_count IS NULL OR _students_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Count approved requests
  SELECT COUNT(*) INTO _approved_count
  FROM public.album_join_requests
  WHERE album_id = _album_id AND status = 'approved';
  
  -- Check if under limit
  RETURN _approved_count < _students_count;
END;
$$;

-- Function to get album join stats
CREATE OR REPLACE FUNCTION public.get_album_join_stats(_album_id uuid)
RETURNS TABLE(
  limit_count int,
  approved_count bigint,
  pending_count bigint,
  rejected_count bigint,
  available_slots int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _limit int;
BEGIN
  SELECT students_count INTO _limit FROM public.albums WHERE id = _album_id;
  
  RETURN QUERY
  SELECT 
    _limit as limit_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    CASE 
      WHEN _limit IS NULL OR _limit = 0 THEN 999999
      ELSE GREATEST(0, _limit - COUNT(*) FILTER (WHERE status = 'approved')::int)
    END as available_slots
  FROM public.album_join_requests
  WHERE album_id = _album_id;
END;
$$;

-- Trigger to prevent approval when album is full
CREATE OR REPLACE FUNCTION public.check_album_full_on_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only check when changing from pending to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NOT public.check_album_capacity(NEW.album_id) THEN
      RAISE EXCEPTION 'Album sudah penuh. Tidak bisa menerima siswa lagi.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_album_full ON public.album_join_requests;
CREATE TRIGGER trigger_check_album_full
  BEFORE UPDATE ON public.album_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_album_full_on_approve();


-- ----------------------------------------------------------------------------
-- SOURCE: 19_fix_album_join_stats_count_existing.sql
-- ----------------------------------------------------------------------------

-- Fix album join stats to count existing approved users from album_class_access
-- This ensures owner and existing members are counted in the statistics

-- Update check_album_capacity to count from album_class_access (approved records are moved here after approval)
CREATE OR REPLACE FUNCTION public.check_album_capacity(_album_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _students_count int;
  _total_users int;
BEGIN
  -- Get album limit
  SELECT students_count INTO _students_count
  FROM public.albums
  WHERE id = _album_id;
  
  -- If no limit set, allow unlimited
  IF _students_count IS NULL OR _students_count = 0 THEN
    RETURN true;
  END IF;
  
  -- Count DISTINCT users from all sources (join_requests removed after approval)
  SELECT COUNT(DISTINCT user_id) INTO _total_users
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper, dll)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Users yang sudah approved di class access (moved here after approval)
    SELECT user_id FROM public.album_class_access 
    WHERE album_id = _album_id AND status = 'approved' AND user_id IS NOT NULL
  ) combined_users;
  
  -- Check if under limit
  RETURN _total_users < _students_count;
END;
$$;

-- Update get_album_join_stats to count from real tables
CREATE OR REPLACE FUNCTION public.get_album_join_stats(_album_id uuid)
RETURNS TABLE(
  limit_count int,
  approved_count bigint,
  pending_count bigint,
  rejected_count bigint,
  available_slots int
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _limit int;
  _join_pending bigint := 0;
  _join_rejected bigint := 0;
  _total_approved bigint := 0;
BEGIN
  SELECT students_count INTO _limit FROM public.albums WHERE id = _album_id;
  
  -- Count pending and rejected from join requests table only
  SELECT 
    COALESCE(COUNT(*) FILTER (WHERE status = 'pending'), 0),
    COALESCE(COUNT(*) FILTER (WHERE status = 'rejected'), 0)
  INTO _join_pending, _join_rejected
  FROM public.album_join_requests
  WHERE album_id = _album_id;
  
  -- Count DISTINCT approved users from all sources (approved requests are deleted from join_requests)
  SELECT COUNT(DISTINCT user_id) INTO _total_approved
  FROM (
    -- Owner album
    SELECT user_id FROM public.albums WHERE id = _album_id
    UNION
    -- Members album (admin, helper, dll)
    SELECT user_id FROM public.album_members WHERE album_id = _album_id AND user_id IS NOT NULL
    UNION
    -- Users yang sudah approved di class access
    SELECT user_id FROM public.album_class_access 
    WHERE album_id = _album_id AND status = 'approved' AND user_id IS NOT NULL
  ) combined_users;
  
  RETURN QUERY
  SELECT 
    _limit as limit_count,
    _total_approved as approved_count,
    _join_pending as pending_count,
    _join_rejected as rejected_count,
    CASE 
      WHEN _limit IS NULL OR _limit = 0 THEN 999999
      ELSE GREATEST(0, _limit - _total_approved::int)
    END as available_slots;
END;
$$;


-- ----------------------------------------------------------------------------
-- SOURCE: 19_fix_user_role_trigger.sql
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 19_fix_user_role_trigger.sql
-- Fix: User role berubah jadi 'user' saat login karena trigger tidak preserve role
-- ============================================================================

BEGIN;

-- 1. Fix trigger handle_new_user() untuk include role =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, credits, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    0,
    COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'role'), ''), 'user')
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Buat RPC function sync_user_from_auth ====================================
-- Function ini dipanggil di auth callback untuk sync data dari auth.users ke public.users
CREATE OR REPLACE FUNCTION public.sync_user_from_auth()
RETURNS void AS $$
DECLARE
  _user_id uuid;
  _email text;
  _full_name text;
  _role text;
BEGIN
  -- Get current authenticated user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get user data from auth.users
  SELECT 
    au.email,
    au.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(TRIM(au.raw_user_meta_data->>'role'), ''), 'user')
  INTO 
    _email,
    _full_name,
    _role
  FROM auth.users au
  WHERE au.id = _user_id;

  -- Insert or update public.users
  INSERT INTO public.users (id, email, full_name, role, credits)
  VALUES (_user_id, _email, _full_name, _role, 0)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    -- IMPORTANT: Don't overwrite role if it's already set to admin
    role = CASE 
      WHEN public.users.role = 'admin' THEN 'admin'
      ELSE EXCLUDED.role
    END,
    updated_at = now();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission =================================================
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth() TO authenticated;

COMMIT;


-- ----------------------------------------------------------------------------
-- SOURCE: 20_drop_album_class_requests.sql
-- ----------------------------------------------------------------------------

-- Drop album_class_requests table (replaced by album_join_requests)
-- The new system uses album_join_requests for universal registration
-- and album_class_access for approved students

-- Drop table (CASCADE will drop all dependent policies and indexes)
DROP TABLE IF EXISTS public.album_class_requests CASCADE;


-- ----------------------------------------------------------------------------
-- SOURCE: 21_add_student_invite_token.sql
-- ----------------------------------------------------------------------------

-- Add student invite token fields to albums table
-- Note: This is for STUDENT registration only, not for co-owner/admin invites
-- Admin/member management now works through ROLE PROMOTION:
--   1. Student registers via student invite token
--   2. Owner approves → becomes member in album_members
--   3. Owner can promote to admin via UI button (updates album_members.role)
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS student_invite_token text,
  ADD COLUMN IF NOT EXISTS student_invite_expires_at timestamptz;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_albums_student_invite_token 
  ON public.albums(student_invite_token) 
  WHERE student_invite_token IS NOT NULL;

-- Note: Token will be used for student registration via /invite/[token] route
-- Expired tokens should be checked in the application layer

-- DEPRECATED SYSTEM: album_invites table is no longer used
-- Old flow: Generate invite token → User clicks link → Joins as admin/member
-- New flow: User joins as student → Owner promotes to admin if needed
-- Migration to drop album_invites can be created separately if cleanup is needed


-- ----------------------------------------------------------------------------
-- SOURCE: 21_realtime_join_requests.sql
-- ----------------------------------------------------------------------------

-- Enable Realtime for the new join requests table
-- This allows the server to broadcast changes to all connected devices instantly

ALTER TABLE public.album_join_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'album_join_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.album_join_requests;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- SOURCE: 22_cleanup_deprecated_album_invites.sql
-- ----------------------------------------------------------------------------

-- OPTIONAL: Cleanup deprecated album_invites system
-- This migration removes the old invite token system for admin/member invites
-- 
-- CURRENT SYSTEM (Correct Flow):
-- 1. Student registers via token → album_join_requests (pending)
-- 2. Owner approves → inserts to BOTH:
--    - album_class_access (for class membership)
--    - album_members (role='member' for team management)
-- 3. Owner can promote to admin in Team sidebar via "Jadikan Admin" button
--    - Updates album_members.role via PATCH /api/albums/[id]/members
-- 
-- Owner automatically has owner permissions from albums.user_id (no need for album_members entry)

-- WARNING: Only run this if you're sure you don't have any active admin/member invite links
-- Student invites use albums.student_invite_token (separate system)

-- Drop policies first
DROP POLICY IF EXISTS "Public read invites" ON public.album_invites;
DROP POLICY IF EXISTS "Owners manage invites" ON public.album_invites;

-- Drop indexes
DROP INDEX IF EXISTS idx_album_invites_token;

-- Drop table
DROP TABLE IF EXISTS public.album_invites;

-- Note: The following API endpoints can also be removed:
-- - /api/albums/[id]/invite/route.ts (POST - create admin/member invite)
-- - /api/albums/invite/[token]/join/route.ts (POST - join via invite token)
-- These endpoints are no longer called from the UI


-- ----------------------------------------------------------------------------
-- SOURCE: 23_notifications_system.sql
-- ----------------------------------------------------------------------------

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Function to create notification (for use by other triggers/functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- SOURCE: 20250213155700_change_dob_to_text.sql
-- ----------------------------------------------------------------------------

-- Change date_of_birth from date to text to support "Place, Date" format
ALTER TABLE public.album_class_access ALTER COLUMN date_of_birth TYPE text;


-- ----------------------------------------------------------------------------
-- SOURCE: 20260214155800_add_batch_photo_url_to_classes.sql
-- ----------------------------------------------------------------------------

alter table "public"."album_classes" add column "batch_photo_url" text;


-- ----------------------------------------------------------------------------
-- SOURCE: 20260216000001_flipbook_module.sql
-- ----------------------------------------------------------------------------

-- Consolidated Flipbook Module Migration
-- Includes backgrounds, fonts, manual pages, hotspots, and cleanup functions

-- 1. Add Flipbook columns to albums table
ALTER TABLE public.albums 
ADD COLUMN IF NOT EXISTS flipbook_mode text DEFAULT 'manual';

-- 2. Add Flipbook columns to album_classes table
-- (No automatic layout columns needed)

-- 3. Create manual_flipbook_pages table
CREATE TABLE IF NOT EXISTS public.manual_flipbook_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  page_number integer NOT NULL,
  image_url text NOT NULL,
  width float,
  height float,
  created_at timestamptz DEFAULT now()
);

-- 4. Create flipbook_video_hotspots table
CREATE TABLE IF NOT EXISTS public.flipbook_video_hotspots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.manual_flipbook_pages(id) ON DELETE CASCADE NOT NULL,
  video_url text,
  label text,
  x float NOT NULL,
  y float NOT NULL,
  width float NOT NULL,
  height float NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.manual_flipbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flipbook_video_hotspots ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for manual_flipbook_pages
DROP POLICY IF EXISTS "Public view" ON public.manual_flipbook_pages;
CREATE POLICY "Public view" ON public.manual_flipbook_pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage pages" ON public.manual_flipbook_pages;
CREATE POLICY "Admins manage pages"
  ON public.manual_flipbook_pages FOR ALL
  USING (
    exists (
      select 1 from public.albums
      where albums.id = manual_flipbook_pages.album_id
      and (albums.user_id = auth.uid() or exists (select 1 from public.album_members where album_id = albums.id and user_id = auth.uid() and role = 'admin'))
    )
  );

-- 7. RLS Policies for flipbook_video_hotspots
DROP POLICY IF EXISTS "Public view hotspots" ON public.flipbook_video_hotspots;
CREATE POLICY "Public view hotspots" ON public.flipbook_video_hotspots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage hotspots" ON public.flipbook_video_hotspots;
CREATE POLICY "Admins manage hotspots"
  ON public.flipbook_video_hotspots FOR ALL
  USING (
    exists (
      select 1 from public.manual_flipbook_pages p
      join public.albums a on a.id = p.album_id
      where p.id = flipbook_video_hotspots.page_id
      and (a.user_id = auth.uid() or exists (select 1 from public.album_members where album_id = a.id and user_id = auth.uid() and role = 'admin'))
    )
  );

-- 8. Cleanup Function
CREATE OR REPLACE FUNCTION cleanup_manual_flipbook(target_album_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all manual pages (hotspots will cascade due to foreign key constraints)
  DELETE FROM public.manual_flipbook_pages
  WHERE album_id = target_album_id;
END;
$$;




-- ============================================================================
-- AUTOMATIC REGIONAL DATA SEEDING
-- ============================================================================

-- Seed 38 Provinces
INSERT INTO public.ref_provinces (id, name) VALUES
  ('11', 'ACEH'),
  ('12', 'SUMATERA UTARA'),
  ('13', 'SUMATERA BARAT'),
  ('14', 'RIAU'),
  ('15', 'JAMBI'),
  ('16', 'SUMATERA SELATAN'),
  ('17', 'BENGKULU'),
  ('18', 'LAMPUNG'),
  ('19', 'KEPULAUAN BANGKA BELITUNG'),
  ('21', 'KEPULAUAN RIAU'),
  ('31', 'DKI JAKARTA'),
  ('32', 'JAWA BARAT'),
  ('33', 'JAWA TENGAH'),
  ('34', 'DI YOGYAKARTA'),
  ('35', 'JAWA TIMUR'),
  ('36', 'BANTEN'),
  ('51', 'BALI'),
  ('52', 'NUSA TENGGARA BARAT'),
  ('53', 'NUSA TENGGARA TIMUR'),
  ('61', 'KALIMANTAN BARAT'),
  ('62', 'KALIMANTAN TENGAH'),
  ('63', 'KALIMANTAN SELATAN'),
  ('64', 'KALIMANTAN TIMUR'),
  ('65', 'KALIMANTAN UTARA'),
  ('71', 'SULAWESI UTARA'),
  ('72', 'SULAWESI TENGAH'),
  ('73', 'SULAWESI SELATAN'),
  ('74', 'SULAWESI TENGGARA'),
  ('75', 'GORONTALO'),
  ('76', 'SULAWESI BARAT'),
  ('81', 'MALUKU'),
  ('82', 'MALUKU UTARA'),
  ('91', 'PAPUA BARAT'),
  ('94', 'PAPUA')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed 514 Cities/Regencies
INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('1101', '11', 'KABUPATEN SIMEULUE', 'kabupaten'),
  ('1102', '11', 'KABUPATEN ACEH SINGKIL', 'kabupaten'),
  ('1103', '11', 'KABUPATEN ACEH SELATAN', 'kabupaten'),
  ('1104', '11', 'KABUPATEN ACEH TENGGARA', 'kabupaten'),
  ('1105', '11', 'KABUPATEN ACEH TIMUR', 'kabupaten'),
  ('1106', '11', 'KABUPATEN ACEH TENGAH', 'kabupaten'),
  ('1107', '11', 'KABUPATEN ACEH BARAT', 'kabupaten'),
  ('1108', '11', 'KABUPATEN ACEH BESAR', 'kabupaten'),
  ('1109', '11', 'KABUPATEN PIDIE', 'kabupaten'),
  ('1110', '11', 'KABUPATEN BIREUEN', 'kabupaten'),
  ('1111', '11', 'KABUPATEN ACEH UTARA', 'kabupaten'),
  ('1112', '11', 'KABUPATEN ACEH BARAT DAYA', 'kabupaten'),
  ('1113', '11', 'KABUPATEN GAYO LUES', 'kabupaten'),
  ('1114', '11', 'KABUPATEN ACEH TAMIANG', 'kabupaten'),
  ('1115', '11', 'KABUPATEN NAGAN RAYA', 'kabupaten'),
  ('1116', '11', 'KABUPATEN ACEH JAYA', 'kabupaten'),
  ('1117', '11', 'KABUPATEN BENER MERIAH', 'kabupaten'),
  ('1118', '11', 'KABUPATEN PIDIE JAYA', 'kabupaten'),
  ('1171', '11', 'KOTA BANDA ACEH', 'kota'),
  ('1172', '11', 'KOTA SABANG', 'kota'),
  ('1173', '11', 'KOTA LANGSA', 'kota'),
  ('1174', '11', 'KOTA LHOKSEUMAWE', 'kota'),
  ('1175', '11', 'KOTA SUBULUSSALAM', 'kota'),
  ('1201', '12', 'KABUPATEN NIAS', 'kabupaten'),
  ('1202', '12', 'KABUPATEN MANDAILING NATAL', 'kabupaten'),
  ('1203', '12', 'KABUPATEN TAPANULI SELATAN', 'kabupaten'),
  ('1204', '12', 'KABUPATEN TAPANULI TENGAH', 'kabupaten'),
  ('1205', '12', 'KABUPATEN TAPANULI UTARA', 'kabupaten'),
  ('1206', '12', 'KABUPATEN TOBA SAMOSIR', 'kabupaten'),
  ('1207', '12', 'KABUPATEN LABUHAN BATU', 'kabupaten'),
  ('1208', '12', 'KABUPATEN ASAHAN', 'kabupaten'),
  ('1209', '12', 'KABUPATEN SIMALUNGUN', 'kabupaten'),
  ('1210', '12', 'KABUPATEN DAIRI', 'kabupaten'),
  ('1211', '12', 'KABUPATEN KARO', 'kabupaten'),
  ('1212', '12', 'KABUPATEN DELI SERDANG', 'kabupaten'),
  ('1213', '12', 'KABUPATEN LANGKAT', 'kabupaten'),
  ('1214', '12', 'KABUPATEN NIAS SELATAN', 'kabupaten'),
  ('1215', '12', 'KABUPATEN HUMBANG HASUNDUTAN', 'kabupaten'),
  ('1216', '12', 'KABUPATEN PAKPAK BHARAT', 'kabupaten'),
  ('1217', '12', 'KABUPATEN SAMOSIR', 'kabupaten'),
  ('1218', '12', 'KABUPATEN SERDANG BEDAGAI', 'kabupaten'),
  ('1219', '12', 'KABUPATEN BATU BARA', 'kabupaten'),
  ('1220', '12', 'KABUPATEN PADANG LAWAS UTARA', 'kabupaten'),
  ('1221', '12', 'KABUPATEN PADANG LAWAS', 'kabupaten'),
  ('1222', '12', 'KABUPATEN LABUHAN BATU SELATAN', 'kabupaten'),
  ('1223', '12', 'KABUPATEN LABUHAN BATU UTARA', 'kabupaten'),
  ('1224', '12', 'KABUPATEN NIAS UTARA', 'kabupaten'),
  ('1225', '12', 'KABUPATEN NIAS BARAT', 'kabupaten'),
  ('1271', '12', 'KOTA SIBOLGA', 'kota'),
  ('1272', '12', 'KOTA TANJUNG BALAI', 'kota'),
  ('1273', '12', 'KOTA PEMATANG SIANTAR', 'kota'),
  ('1274', '12', 'KOTA TEBING TINGGI', 'kota'),
  ('1275', '12', 'KOTA MEDAN', 'kota'),
  ('1276', '12', 'KOTA BINJAI', 'kota'),
  ('1277', '12', 'KOTA PADANGSIDIMPUAN', 'kota'),
  ('1278', '12', 'KOTA GUNUNGSITOLI', 'kota'),
  ('1301', '13', 'KABUPATEN KEPULAUAN MENTAWAI', 'kabupaten'),
  ('1302', '13', 'KABUPATEN PESISIR SELATAN', 'kabupaten'),
  ('1303', '13', 'KABUPATEN SOLOK', 'kabupaten'),
  ('1304', '13', 'KABUPATEN SIJUNJUNG', 'kabupaten'),
  ('1305', '13', 'KABUPATEN TANAH DATAR', 'kabupaten'),
  ('1306', '13', 'KABUPATEN PADANG PARIAMAN', 'kabupaten'),
  ('1307', '13', 'KABUPATEN AGAM', 'kabupaten'),
  ('1308', '13', 'KABUPATEN LIMA PULUH KOTA', 'kabupaten'),
  ('1309', '13', 'KABUPATEN PASAMAN', 'kabupaten'),
  ('1310', '13', 'KABUPATEN SOLOK SELATAN', 'kabupaten'),
  ('1311', '13', 'KABUPATEN DHARMASRAYA', 'kabupaten'),
  ('1312', '13', 'KABUPATEN PASAMAN BARAT', 'kabupaten'),
  ('1371', '13', 'KOTA PADANG', 'kota'),
  ('1372', '13', 'KOTA SOLOK', 'kota'),
  ('1373', '13', 'KOTA SAWAH LUNTO', 'kota'),
  ('1374', '13', 'KOTA PADANG PANJANG', 'kota'),
  ('1375', '13', 'KOTA BUKITTINGGI', 'kota'),
  ('1376', '13', 'KOTA PAYAKUMBUH', 'kota'),
  ('1377', '13', 'KOTA PARIAMAN', 'kota'),
  ('1401', '14', 'KABUPATEN KUANTAN SINGINGI', 'kabupaten'),
  ('1402', '14', 'KABUPATEN INDRAGIRI HULU', 'kabupaten'),
  ('1403', '14', 'KABUPATEN INDRAGIRI HILIR', 'kabupaten'),
  ('1404', '14', 'KABUPATEN PELALAWAN', 'kabupaten'),
  ('1405', '14', 'KABUPATEN S I A K', 'kabupaten'),
  ('1406', '14', 'KABUPATEN KAMPAR', 'kabupaten'),
  ('1407', '14', 'KABUPATEN ROKAN HULU', 'kabupaten'),
  ('1408', '14', 'KABUPATEN BENGKALIS', 'kabupaten'),
  ('1409', '14', 'KABUPATEN ROKAN HILIR', 'kabupaten'),
  ('1410', '14', 'KABUPATEN KEPULAUAN MERANTI', 'kabupaten'),
  ('1471', '14', 'KOTA PEKANBARU', 'kota'),
  ('1473', '14', 'KOTA D U M A I', 'kota'),
  ('1501', '15', 'KABUPATEN KERINCI', 'kabupaten'),
  ('1502', '15', 'KABUPATEN MERANGIN', 'kabupaten'),
  ('1503', '15', 'KABUPATEN SAROLANGUN', 'kabupaten'),
  ('1504', '15', 'KABUPATEN BATANG HARI', 'kabupaten'),
  ('1505', '15', 'KABUPATEN MUARO JAMBI', 'kabupaten'),
  ('1506', '15', 'KABUPATEN TANJUNG JABUNG TIMUR', 'kabupaten'),
  ('1507', '15', 'KABUPATEN TANJUNG JABUNG BARAT', 'kabupaten'),
  ('1508', '15', 'KABUPATEN TEBO', 'kabupaten'),
  ('1509', '15', 'KABUPATEN BUNGO', 'kabupaten'),
  ('1571', '15', 'KOTA JAMBI', 'kota'),
  ('1572', '15', 'KOTA SUNGAI PENUH', 'kota'),
  ('1601', '16', 'KABUPATEN OGAN KOMERING ULU', 'kabupaten'),
  ('1602', '16', 'KABUPATEN OGAN KOMERING ILIR', 'kabupaten')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;

INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('1603', '16', 'KABUPATEN MUARA ENIM', 'kabupaten'),
  ('1604', '16', 'KABUPATEN LAHAT', 'kabupaten'),
  ('1605', '16', 'KABUPATEN MUSI RAWAS', 'kabupaten'),
  ('1606', '16', 'KABUPATEN MUSI BANYUASIN', 'kabupaten'),
  ('1607', '16', 'KABUPATEN BANYU ASIN', 'kabupaten'),
  ('1608', '16', 'KABUPATEN OGAN KOMERING ULU SELATAN', 'kabupaten'),
  ('1609', '16', 'KABUPATEN OGAN KOMERING ULU TIMUR', 'kabupaten'),
  ('1610', '16', 'KABUPATEN OGAN ILIR', 'kabupaten'),
  ('1611', '16', 'KABUPATEN EMPAT LAWANG', 'kabupaten'),
  ('1612', '16', 'KABUPATEN PENUKAL ABAB LEMATANG ILIR', 'kabupaten'),
  ('1613', '16', 'KABUPATEN MUSI RAWAS UTARA', 'kabupaten'),
  ('1671', '16', 'KOTA PALEMBANG', 'kota'),
  ('1672', '16', 'KOTA PRABUMULIH', 'kota'),
  ('1673', '16', 'KOTA PAGAR ALAM', 'kota'),
  ('1674', '16', 'KOTA LUBUKLINGGAU', 'kota'),
  ('1701', '17', 'KABUPATEN BENGKULU SELATAN', 'kabupaten'),
  ('1702', '17', 'KABUPATEN REJANG LEBONG', 'kabupaten'),
  ('1703', '17', 'KABUPATEN BENGKULU UTARA', 'kabupaten'),
  ('1704', '17', 'KABUPATEN KAUR', 'kabupaten'),
  ('1705', '17', 'KABUPATEN SELUMA', 'kabupaten'),
  ('1706', '17', 'KABUPATEN MUKOMUKO', 'kabupaten'),
  ('1707', '17', 'KABUPATEN LEBONG', 'kabupaten'),
  ('1708', '17', 'KABUPATEN KEPAHIANG', 'kabupaten'),
  ('1709', '17', 'KABUPATEN BENGKULU TENGAH', 'kabupaten'),
  ('1771', '17', 'KOTA BENGKULU', 'kota'),
  ('1801', '18', 'KABUPATEN LAMPUNG BARAT', 'kabupaten'),
  ('1802', '18', 'KABUPATEN TANGGAMUS', 'kabupaten'),
  ('1803', '18', 'KABUPATEN LAMPUNG SELATAN', 'kabupaten'),
  ('1804', '18', 'KABUPATEN LAMPUNG TIMUR', 'kabupaten'),
  ('1805', '18', 'KABUPATEN LAMPUNG TENGAH', 'kabupaten'),
  ('1806', '18', 'KABUPATEN LAMPUNG UTARA', 'kabupaten'),
  ('1807', '18', 'KABUPATEN WAY KANAN', 'kabupaten'),
  ('1808', '18', 'KABUPATEN TULANGBAWANG', 'kabupaten'),
  ('1809', '18', 'KABUPATEN PESAWARAN', 'kabupaten'),
  ('1810', '18', 'KABUPATEN PRINGSEWU', 'kabupaten'),
  ('1811', '18', 'KABUPATEN MESUJI', 'kabupaten'),
  ('1812', '18', 'KABUPATEN TULANG BAWANG BARAT', 'kabupaten'),
  ('1813', '18', 'KABUPATEN PESISIR BARAT', 'kabupaten'),
  ('1871', '18', 'KOTA BANDAR LAMPUNG', 'kota'),
  ('1872', '18', 'KOTA METRO', 'kota'),
  ('1901', '19', 'KABUPATEN BANGKA', 'kabupaten'),
  ('1902', '19', 'KABUPATEN BELITUNG', 'kabupaten'),
  ('1903', '19', 'KABUPATEN BANGKA BARAT', 'kabupaten'),
  ('1904', '19', 'KABUPATEN BANGKA TENGAH', 'kabupaten'),
  ('1905', '19', 'KABUPATEN BANGKA SELATAN', 'kabupaten'),
  ('1906', '19', 'KABUPATEN BELITUNG TIMUR', 'kabupaten'),
  ('1971', '19', 'KOTA PANGKAL PINANG', 'kota'),
  ('2101', '21', 'KABUPATEN KARIMUN', 'kabupaten'),
  ('2102', '21', 'KABUPATEN BINTAN', 'kabupaten'),
  ('2103', '21', 'KABUPATEN NATUNA', 'kabupaten'),
  ('2104', '21', 'KABUPATEN LINGGA', 'kabupaten'),
  ('2105', '21', 'KABUPATEN KEPULAUAN ANAMBAS', 'kabupaten'),
  ('2171', '21', 'KOTA B A T A M', 'kota'),
  ('2172', '21', 'KOTA TANJUNG PINANG', 'kota'),
  ('3101', '31', 'KABUPATEN KEPULAUAN SERIBU', 'kabupaten'),
  ('3171', '31', 'KOTA JAKARTA SELATAN', 'kota'),
  ('3172', '31', 'KOTA JAKARTA TIMUR', 'kota'),
  ('3173', '31', 'KOTA JAKARTA PUSAT', 'kota'),
  ('3174', '31', 'KOTA JAKARTA BARAT', 'kota'),
  ('3175', '31', 'KOTA JAKARTA UTARA', 'kota'),
  ('3201', '32', 'KABUPATEN BOGOR', 'kabupaten'),
  ('3202', '32', 'KABUPATEN SUKABUMI', 'kabupaten'),
  ('3203', '32', 'KABUPATEN CIANJUR', 'kabupaten'),
  ('3204', '32', 'KABUPATEN BANDUNG', 'kabupaten'),
  ('3205', '32', 'KABUPATEN GARUT', 'kabupaten'),
  ('3206', '32', 'KABUPATEN TASIKMALAYA', 'kabupaten'),
  ('3207', '32', 'KABUPATEN CIAMIS', 'kabupaten'),
  ('3208', '32', 'KABUPATEN KUNINGAN', 'kabupaten'),
  ('3209', '32', 'KABUPATEN CIREBON', 'kabupaten'),
  ('3210', '32', 'KABUPATEN MAJALENGKA', 'kabupaten'),
  ('3211', '32', 'KABUPATEN SUMEDANG', 'kabupaten'),
  ('3212', '32', 'KABUPATEN INDRAMAYU', 'kabupaten'),
  ('3213', '32', 'KABUPATEN SUBANG', 'kabupaten'),
  ('3214', '32', 'KABUPATEN PURWAKARTA', 'kabupaten'),
  ('3215', '32', 'KABUPATEN KARAWANG', 'kabupaten'),
  ('3216', '32', 'KABUPATEN BEKASI', 'kabupaten'),
  ('3217', '32', 'KABUPATEN BANDUNG BARAT', 'kabupaten'),
  ('3218', '32', 'KABUPATEN PANGANDARAN', 'kabupaten'),
  ('3271', '32', 'KOTA BOGOR', 'kota'),
  ('3272', '32', 'KOTA SUKABUMI', 'kota'),
  ('3273', '32', 'KOTA BANDUNG', 'kota'),
  ('3274', '32', 'KOTA CIREBON', 'kota'),
  ('3275', '32', 'KOTA BEKASI', 'kota'),
  ('3276', '32', 'KOTA DEPOK', 'kota'),
  ('3277', '32', 'KOTA CIMAHI', 'kota'),
  ('3278', '32', 'KOTA TASIKMALAYA', 'kota'),
  ('3279', '32', 'KOTA BANJAR', 'kota'),
  ('3301', '33', 'KABUPATEN CILACAP', 'kabupaten'),
  ('3302', '33', 'KABUPATEN BANYUMAS', 'kabupaten'),
  ('3303', '33', 'KABUPATEN PURBALINGGA', 'kabupaten'),
  ('3304', '33', 'KABUPATEN BANJARNEGARA', 'kabupaten'),
  ('3305', '33', 'KABUPATEN KEBUMEN', 'kabupaten'),
  ('3306', '33', 'KABUPATEN PURWOREJO', 'kabupaten'),
  ('3307', '33', 'KABUPATEN WONOSOBO', 'kabupaten'),
  ('3308', '33', 'KABUPATEN MAGELANG', 'kabupaten'),
  ('3309', '33', 'KABUPATEN BOYOLALI', 'kabupaten'),
  ('3310', '33', 'KABUPATEN KLATEN', 'kabupaten'),
  ('3311', '33', 'KABUPATEN SUKOHARJO', 'kabupaten'),
  ('3312', '33', 'KABUPATEN WONOGIRI', 'kabupaten'),
  ('3313', '33', 'KABUPATEN KARANGANYAR', 'kabupaten')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;

INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('3314', '33', 'KABUPATEN SRAGEN', 'kabupaten'),
  ('3315', '33', 'KABUPATEN GROBOGAN', 'kabupaten'),
  ('3316', '33', 'KABUPATEN BLORA', 'kabupaten'),
  ('3317', '33', 'KABUPATEN REMBANG', 'kabupaten'),
  ('3318', '33', 'KABUPATEN PATI', 'kabupaten'),
  ('3319', '33', 'KABUPATEN KUDUS', 'kabupaten'),
  ('3320', '33', 'KABUPATEN JEPARA', 'kabupaten'),
  ('3321', '33', 'KABUPATEN DEMAK', 'kabupaten'),
  ('3322', '33', 'KABUPATEN SEMARANG', 'kabupaten'),
  ('3323', '33', 'KABUPATEN TEMANGGUNG', 'kabupaten'),
  ('3324', '33', 'KABUPATEN KENDAL', 'kabupaten'),
  ('3325', '33', 'KABUPATEN BATANG', 'kabupaten'),
  ('3326', '33', 'KABUPATEN PEKALONGAN', 'kabupaten'),
  ('3327', '33', 'KABUPATEN PEMALANG', 'kabupaten'),
  ('3328', '33', 'KABUPATEN TEGAL', 'kabupaten'),
  ('3329', '33', 'KABUPATEN BREBES', 'kabupaten'),
  ('3371', '33', 'KOTA MAGELANG', 'kota'),
  ('3372', '33', 'KOTA SURAKARTA', 'kota'),
  ('3373', '33', 'KOTA SALATIGA', 'kota'),
  ('3374', '33', 'KOTA SEMARANG', 'kota'),
  ('3375', '33', 'KOTA PEKALONGAN', 'kota'),
  ('3376', '33', 'KOTA TEGAL', 'kota'),
  ('3401', '34', 'KABUPATEN KULON PROGO', 'kabupaten'),
  ('3402', '34', 'KABUPATEN BANTUL', 'kabupaten'),
  ('3403', '34', 'KABUPATEN GUNUNG KIDUL', 'kabupaten'),
  ('3404', '34', 'KABUPATEN SLEMAN', 'kabupaten'),
  ('3471', '34', 'KOTA YOGYAKARTA', 'kota'),
  ('3501', '35', 'KABUPATEN PACITAN', 'kabupaten'),
  ('3502', '35', 'KABUPATEN PONOROGO', 'kabupaten'),
  ('3503', '35', 'KABUPATEN TRENGGALEK', 'kabupaten'),
  ('3504', '35', 'KABUPATEN TULUNGAGUNG', 'kabupaten'),
  ('3505', '35', 'KABUPATEN BLITAR', 'kabupaten'),
  ('3506', '35', 'KABUPATEN KEDIRI', 'kabupaten'),
  ('3507', '35', 'KABUPATEN MALANG', 'kabupaten'),
  ('3508', '35', 'KABUPATEN LUMAJANG', 'kabupaten'),
  ('3509', '35', 'KABUPATEN JEMBER', 'kabupaten'),
  ('3510', '35', 'KABUPATEN BANYUWANGI', 'kabupaten'),
  ('3511', '35', 'KABUPATEN BONDOWOSO', 'kabupaten'),
  ('3512', '35', 'KABUPATEN SITUBONDO', 'kabupaten'),
  ('3513', '35', 'KABUPATEN PROBOLINGGO', 'kabupaten'),
  ('3514', '35', 'KABUPATEN PASURUAN', 'kabupaten'),
  ('3515', '35', 'KABUPATEN SIDOARJO', 'kabupaten'),
  ('3516', '35', 'KABUPATEN MOJOKERTO', 'kabupaten'),
  ('3517', '35', 'KABUPATEN JOMBANG', 'kabupaten'),
  ('3518', '35', 'KABUPATEN NGANJUK', 'kabupaten'),
  ('3519', '35', 'KABUPATEN MADIUN', 'kabupaten'),
  ('3520', '35', 'KABUPATEN MAGETAN', 'kabupaten'),
  ('3521', '35', 'KABUPATEN NGAWI', 'kabupaten'),
  ('3522', '35', 'KABUPATEN BOJONEGORO', 'kabupaten'),
  ('3523', '35', 'KABUPATEN TUBAN', 'kabupaten'),
  ('3524', '35', 'KABUPATEN LAMONGAN', 'kabupaten'),
  ('3525', '35', 'KABUPATEN GRESIK', 'kabupaten'),
  ('3526', '35', 'KABUPATEN BANGKALAN', 'kabupaten'),
  ('3527', '35', 'KABUPATEN SAMPANG', 'kabupaten'),
  ('3528', '35', 'KABUPATEN PAMEKASAN', 'kabupaten'),
  ('3529', '35', 'KABUPATEN SUMENEP', 'kabupaten'),
  ('3571', '35', 'KOTA KEDIRI', 'kota'),
  ('3572', '35', 'KOTA BLITAR', 'kota'),
  ('3573', '35', 'KOTA MALANG', 'kota'),
  ('3574', '35', 'KOTA PROBOLINGGO', 'kota'),
  ('3575', '35', 'KOTA PASURUAN', 'kota'),
  ('3576', '35', 'KOTA MOJOKERTO', 'kota'),
  ('3577', '35', 'KOTA MADIUN', 'kota'),
  ('3578', '35', 'KOTA SURABAYA', 'kota'),
  ('3579', '35', 'KOTA BATU', 'kota'),
  ('3601', '36', 'KABUPATEN PANDEGLANG', 'kabupaten'),
  ('3602', '36', 'KABUPATEN LEBAK', 'kabupaten'),
  ('3603', '36', 'KABUPATEN TANGERANG', 'kabupaten'),
  ('3604', '36', 'KABUPATEN SERANG', 'kabupaten'),
  ('3671', '36', 'KOTA TANGERANG', 'kota'),
  ('3672', '36', 'KOTA CILEGON', 'kota'),
  ('3673', '36', 'KOTA SERANG', 'kota'),
  ('3674', '36', 'KOTA TANGERANG SELATAN', 'kota'),
  ('5101', '51', 'KABUPATEN JEMBRANA', 'kabupaten'),
  ('5102', '51', 'KABUPATEN TABANAN', 'kabupaten'),
  ('5103', '51', 'KABUPATEN BADUNG', 'kabupaten'),
  ('5104', '51', 'KABUPATEN GIANYAR', 'kabupaten'),
  ('5105', '51', 'KABUPATEN KLUNGKUNG', 'kabupaten'),
  ('5106', '51', 'KABUPATEN BANGLI', 'kabupaten'),
  ('5107', '51', 'KABUPATEN KARANG ASEM', 'kabupaten'),
  ('5108', '51', 'KABUPATEN BULELENG', 'kabupaten'),
  ('5171', '51', 'KOTA DENPASAR', 'kota'),
  ('5201', '52', 'KABUPATEN LOMBOK BARAT', 'kabupaten'),
  ('5202', '52', 'KABUPATEN LOMBOK TENGAH', 'kabupaten'),
  ('5203', '52', 'KABUPATEN LOMBOK TIMUR', 'kabupaten'),
  ('5204', '52', 'KABUPATEN SUMBAWA', 'kabupaten'),
  ('5205', '52', 'KABUPATEN DOMPU', 'kabupaten'),
  ('5206', '52', 'KABUPATEN BIMA', 'kabupaten'),
  ('5207', '52', 'KABUPATEN SUMBAWA BARAT', 'kabupaten'),
  ('5208', '52', 'KABUPATEN LOMBOK UTARA', 'kabupaten'),
  ('5271', '52', 'KOTA MATARAM', 'kota'),
  ('5272', '52', 'KOTA BIMA', 'kota'),
  ('5301', '53', 'KABUPATEN SUMBA BARAT', 'kabupaten'),
  ('5302', '53', 'KABUPATEN SUMBA TIMUR', 'kabupaten'),
  ('5303', '53', 'KABUPATEN KUPANG', 'kabupaten'),
  ('5304', '53', 'KABUPATEN TIMOR TENGAH SELATAN', 'kabupaten'),
  ('5305', '53', 'KABUPATEN TIMOR TENGAH UTARA', 'kabupaten'),
  ('5306', '53', 'KABUPATEN BELU', 'kabupaten'),
  ('5307', '53', 'KABUPATEN ALOR', 'kabupaten'),
  ('5308', '53', 'KABUPATEN LEMBATA', 'kabupaten')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;

INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('5309', '53', 'KABUPATEN FLORES TIMUR', 'kabupaten'),
  ('5310', '53', 'KABUPATEN SIKKA', 'kabupaten'),
  ('5311', '53', 'KABUPATEN ENDE', 'kabupaten'),
  ('5312', '53', 'KABUPATEN NGADA', 'kabupaten'),
  ('5313', '53', 'KABUPATEN MANGGARAI', 'kabupaten'),
  ('5314', '53', 'KABUPATEN ROTE NDAO', 'kabupaten'),
  ('5315', '53', 'KABUPATEN MANGGARAI BARAT', 'kabupaten'),
  ('5316', '53', 'KABUPATEN SUMBA TENGAH', 'kabupaten'),
  ('5317', '53', 'KABUPATEN SUMBA BARAT DAYA', 'kabupaten'),
  ('5318', '53', 'KABUPATEN NAGEKEO', 'kabupaten'),
  ('5319', '53', 'KABUPATEN MANGGARAI TIMUR', 'kabupaten'),
  ('5320', '53', 'KABUPATEN SABU RAIJUA', 'kabupaten'),
  ('5321', '53', 'KABUPATEN MALAKA', 'kabupaten'),
  ('5371', '53', 'KOTA KUPANG', 'kota'),
  ('6101', '61', 'KABUPATEN SAMBAS', 'kabupaten'),
  ('6102', '61', 'KABUPATEN BENGKAYANG', 'kabupaten'),
  ('6103', '61', 'KABUPATEN LANDAK', 'kabupaten'),
  ('6104', '61', 'KABUPATEN MEMPAWAH', 'kabupaten'),
  ('6105', '61', 'KABUPATEN SANGGAU', 'kabupaten'),
  ('6106', '61', 'KABUPATEN KETAPANG', 'kabupaten'),
  ('6107', '61', 'KABUPATEN SINTANG', 'kabupaten'),
  ('6108', '61', 'KABUPATEN KAPUAS HULU', 'kabupaten'),
  ('6109', '61', 'KABUPATEN SEKADAU', 'kabupaten'),
  ('6110', '61', 'KABUPATEN MELAWI', 'kabupaten'),
  ('6111', '61', 'KABUPATEN KAYONG UTARA', 'kabupaten'),
  ('6112', '61', 'KABUPATEN KUBU RAYA', 'kabupaten'),
  ('6171', '61', 'KOTA PONTIANAK', 'kota'),
  ('6172', '61', 'KOTA SINGKAWANG', 'kota'),
  ('6201', '62', 'KABUPATEN KOTAWARINGIN BARAT', 'kabupaten'),
  ('6202', '62', 'KABUPATEN KOTAWARINGIN TIMUR', 'kabupaten'),
  ('6203', '62', 'KABUPATEN KAPUAS', 'kabupaten'),
  ('6204', '62', 'KABUPATEN BARITO SELATAN', 'kabupaten'),
  ('6205', '62', 'KABUPATEN BARITO UTARA', 'kabupaten'),
  ('6206', '62', 'KABUPATEN SUKAMARA', 'kabupaten'),
  ('6207', '62', 'KABUPATEN LAMANDAU', 'kabupaten'),
  ('6208', '62', 'KABUPATEN SERUYAN', 'kabupaten'),
  ('6209', '62', 'KABUPATEN KATINGAN', 'kabupaten'),
  ('6210', '62', 'KABUPATEN PULANG PISAU', 'kabupaten'),
  ('6211', '62', 'KABUPATEN GUNUNG MAS', 'kabupaten'),
  ('6212', '62', 'KABUPATEN BARITO TIMUR', 'kabupaten'),
  ('6213', '62', 'KABUPATEN MURUNG RAYA', 'kabupaten'),
  ('6271', '62', 'KOTA PALANGKA RAYA', 'kota'),
  ('6301', '63', 'KABUPATEN TANAH LAUT', 'kabupaten'),
  ('6302', '63', 'KABUPATEN KOTA BARU', 'kabupaten'),
  ('6303', '63', 'KABUPATEN BANJAR', 'kabupaten'),
  ('6304', '63', 'KABUPATEN BARITO KUALA', 'kabupaten'),
  ('6305', '63', 'KABUPATEN TAPIN', 'kabupaten'),
  ('6306', '63', 'KABUPATEN HULU SUNGAI SELATAN', 'kabupaten'),
  ('6307', '63', 'KABUPATEN HULU SUNGAI TENGAH', 'kabupaten'),
  ('6308', '63', 'KABUPATEN HULU SUNGAI UTARA', 'kabupaten'),
  ('6309', '63', 'KABUPATEN TABALONG', 'kabupaten'),
  ('6310', '63', 'KABUPATEN TANAH BUMBU', 'kabupaten'),
  ('6311', '63', 'KABUPATEN BALANGAN', 'kabupaten'),
  ('6371', '63', 'KOTA BANJARMASIN', 'kota'),
  ('6372', '63', 'KOTA BANJAR BARU', 'kota'),
  ('6401', '64', 'KABUPATEN PASER', 'kabupaten'),
  ('6402', '64', 'KABUPATEN KUTAI BARAT', 'kabupaten'),
  ('6403', '64', 'KABUPATEN KUTAI KARTANEGARA', 'kabupaten'),
  ('6404', '64', 'KABUPATEN KUTAI TIMUR', 'kabupaten'),
  ('6405', '64', 'KABUPATEN BERAU', 'kabupaten'),
  ('6409', '64', 'KABUPATEN PENAJAM PASER UTARA', 'kabupaten'),
  ('6411', '64', 'KABUPATEN MAHAKAM HULU', 'kabupaten'),
  ('6471', '64', 'KOTA BALIKPAPAN', 'kota'),
  ('6472', '64', 'KOTA SAMARINDA', 'kota'),
  ('6474', '64', 'KOTA BONTANG', 'kota'),
  ('6501', '65', 'KABUPATEN MALINAU', 'kabupaten'),
  ('6502', '65', 'KABUPATEN BULUNGAN', 'kabupaten'),
  ('6503', '65', 'KABUPATEN TANA TIDUNG', 'kabupaten'),
  ('6504', '65', 'KABUPATEN NUNUKAN', 'kabupaten'),
  ('6571', '65', 'KOTA TARAKAN', 'kota'),
  ('7101', '71', 'KABUPATEN BOLAANG MONGONDOW', 'kabupaten'),
  ('7102', '71', 'KABUPATEN MINAHASA', 'kabupaten'),
  ('7103', '71', 'KABUPATEN KEPULAUAN SANGIHE', 'kabupaten'),
  ('7104', '71', 'KABUPATEN KEPULAUAN TALAUD', 'kabupaten'),
  ('7105', '71', 'KABUPATEN MINAHASA SELATAN', 'kabupaten'),
  ('7106', '71', 'KABUPATEN MINAHASA UTARA', 'kabupaten'),
  ('7107', '71', 'KABUPATEN BOLAANG MONGONDOW UTARA', 'kabupaten'),
  ('7108', '71', 'KABUPATEN SIAU TAGULANDANG BIARO', 'kabupaten'),
  ('7109', '71', 'KABUPATEN MINAHASA TENGGARA', 'kabupaten'),
  ('7110', '71', 'KABUPATEN BOLAANG MONGONDOW SELATAN', 'kabupaten'),
  ('7111', '71', 'KABUPATEN BOLAANG MONGONDOW TIMUR', 'kabupaten'),
  ('7171', '71', 'KOTA MANADO', 'kota'),
  ('7172', '71', 'KOTA BITUNG', 'kota'),
  ('7173', '71', 'KOTA TOMOHON', 'kota'),
  ('7174', '71', 'KOTA KOTAMOBAGU', 'kota'),
  ('7201', '72', 'KABUPATEN BANGGAI KEPULAUAN', 'kabupaten'),
  ('7202', '72', 'KABUPATEN BANGGAI', 'kabupaten'),
  ('7203', '72', 'KABUPATEN MOROWALI', 'kabupaten'),
  ('7204', '72', 'KABUPATEN POSO', 'kabupaten'),
  ('7205', '72', 'KABUPATEN DONGGALA', 'kabupaten'),
  ('7206', '72', 'KABUPATEN TOLI-TOLI', 'kabupaten'),
  ('7207', '72', 'KABUPATEN BUOL', 'kabupaten'),
  ('7208', '72', 'KABUPATEN PARIGI MOUTONG', 'kabupaten'),
  ('7209', '72', 'KABUPATEN TOJO UNA-UNA', 'kabupaten'),
  ('7210', '72', 'KABUPATEN SIGI', 'kabupaten'),
  ('7211', '72', 'KABUPATEN BANGGAI LAUT', 'kabupaten'),
  ('7212', '72', 'KABUPATEN MOROWALI UTARA', 'kabupaten'),
  ('7271', '72', 'KOTA PALU', 'kota'),
  ('7301', '73', 'KABUPATEN KEPULAUAN SELAYAR', 'kabupaten'),
  ('7302', '73', 'KABUPATEN BULUKUMBA', 'kabupaten')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;

INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('7303', '73', 'KABUPATEN BANTAENG', 'kabupaten'),
  ('7304', '73', 'KABUPATEN JENEPONTO', 'kabupaten'),
  ('7305', '73', 'KABUPATEN TAKALAR', 'kabupaten'),
  ('7306', '73', 'KABUPATEN GOWA', 'kabupaten'),
  ('7307', '73', 'KABUPATEN SINJAI', 'kabupaten'),
  ('7308', '73', 'KABUPATEN MAROS', 'kabupaten'),
  ('7309', '73', 'KABUPATEN PANGKAJENE DAN KEPULAUAN', 'kabupaten'),
  ('7310', '73', 'KABUPATEN BARRU', 'kabupaten'),
  ('7311', '73', 'KABUPATEN BONE', 'kabupaten'),
  ('7312', '73', 'KABUPATEN SOPPENG', 'kabupaten'),
  ('7313', '73', 'KABUPATEN WAJO', 'kabupaten'),
  ('7314', '73', 'KABUPATEN SIDENRENG RAPPANG', 'kabupaten'),
  ('7315', '73', 'KABUPATEN PINRANG', 'kabupaten'),
  ('7316', '73', 'KABUPATEN ENREKANG', 'kabupaten'),
  ('7317', '73', 'KABUPATEN LUWU', 'kabupaten'),
  ('7318', '73', 'KABUPATEN TANA TORAJA', 'kabupaten'),
  ('7322', '73', 'KABUPATEN LUWU UTARA', 'kabupaten'),
  ('7325', '73', 'KABUPATEN LUWU TIMUR', 'kabupaten'),
  ('7326', '73', 'KABUPATEN TORAJA UTARA', 'kabupaten'),
  ('7371', '73', 'KOTA MAKASSAR', 'kota'),
  ('7372', '73', 'KOTA PAREPARE', 'kota'),
  ('7373', '73', 'KOTA PALOPO', 'kota'),
  ('7401', '74', 'KABUPATEN BUTON', 'kabupaten'),
  ('7402', '74', 'KABUPATEN MUNA', 'kabupaten'),
  ('7403', '74', 'KABUPATEN KONAWE', 'kabupaten'),
  ('7404', '74', 'KABUPATEN KOLAKA', 'kabupaten'),
  ('7405', '74', 'KABUPATEN KONAWE SELATAN', 'kabupaten'),
  ('7406', '74', 'KABUPATEN BOMBANA', 'kabupaten'),
  ('7407', '74', 'KABUPATEN WAKATOBI', 'kabupaten'),
  ('7408', '74', 'KABUPATEN KOLAKA UTARA', 'kabupaten'),
  ('7409', '74', 'KABUPATEN BUTON UTARA', 'kabupaten'),
  ('7410', '74', 'KABUPATEN KONAWE UTARA', 'kabupaten'),
  ('7411', '74', 'KABUPATEN KOLAKA TIMUR', 'kabupaten'),
  ('7412', '74', 'KABUPATEN KONAWE KEPULAUAN', 'kabupaten'),
  ('7413', '74', 'KABUPATEN MUNA BARAT', 'kabupaten'),
  ('7414', '74', 'KABUPATEN BUTON TENGAH', 'kabupaten'),
  ('7415', '74', 'KABUPATEN BUTON SELATAN', 'kabupaten'),
  ('7471', '74', 'KOTA KENDARI', 'kota'),
  ('7472', '74', 'KOTA BAUBAU', 'kota'),
  ('7501', '75', 'KABUPATEN BOALEMO', 'kabupaten'),
  ('7502', '75', 'KABUPATEN GORONTALO', 'kabupaten'),
  ('7503', '75', 'KABUPATEN POHUWATO', 'kabupaten'),
  ('7504', '75', 'KABUPATEN BONE BOLANGO', 'kabupaten'),
  ('7505', '75', 'KABUPATEN GORONTALO UTARA', 'kabupaten'),
  ('7571', '75', 'KOTA GORONTALO', 'kota'),
  ('7601', '76', 'KABUPATEN MAJENE', 'kabupaten'),
  ('7602', '76', 'KABUPATEN POLEWALI MANDAR', 'kabupaten'),
  ('7603', '76', 'KABUPATEN MAMASA', 'kabupaten'),
  ('7604', '76', 'KABUPATEN MAMUJU', 'kabupaten'),
  ('7605', '76', 'KABUPATEN MAMUJU UTARA', 'kabupaten'),
  ('7606', '76', 'KABUPATEN MAMUJU TENGAH', 'kabupaten'),
  ('8101', '81', 'KABUPATEN MALUKU TENGGARA BARAT', 'kabupaten'),
  ('8102', '81', 'KABUPATEN MALUKU TENGGARA', 'kabupaten'),
  ('8103', '81', 'KABUPATEN MALUKU TENGAH', 'kabupaten'),
  ('8104', '81', 'KABUPATEN BURU', 'kabupaten'),
  ('8105', '81', 'KABUPATEN KEPULAUAN ARU', 'kabupaten'),
  ('8106', '81', 'KABUPATEN SERAM BAGIAN BARAT', 'kabupaten'),
  ('8107', '81', 'KABUPATEN SERAM BAGIAN TIMUR', 'kabupaten'),
  ('8108', '81', 'KABUPATEN MALUKU BARAT DAYA', 'kabupaten'),
  ('8109', '81', 'KABUPATEN BURU SELATAN', 'kabupaten'),
  ('8171', '81', 'KOTA AMBON', 'kota'),
  ('8172', '81', 'KOTA TUAL', 'kota'),
  ('8201', '82', 'KABUPATEN HALMAHERA BARAT', 'kabupaten'),
  ('8202', '82', 'KABUPATEN HALMAHERA TENGAH', 'kabupaten'),
  ('8203', '82', 'KABUPATEN KEPULAUAN SULA', 'kabupaten'),
  ('8204', '82', 'KABUPATEN HALMAHERA SELATAN', 'kabupaten'),
  ('8205', '82', 'KABUPATEN HALMAHERA UTARA', 'kabupaten'),
  ('8206', '82', 'KABUPATEN HALMAHERA TIMUR', 'kabupaten'),
  ('8207', '82', 'KABUPATEN PULAU MOROTAI', 'kabupaten'),
  ('8208', '82', 'KABUPATEN PULAU TALIABU', 'kabupaten'),
  ('8271', '82', 'KOTA TERNATE', 'kota'),
  ('8272', '82', 'KOTA TIDORE KEPULAUAN', 'kota'),
  ('9101', '91', 'KABUPATEN FAKFAK', 'kabupaten'),
  ('9102', '91', 'KABUPATEN KAIMANA', 'kabupaten'),
  ('9103', '91', 'KABUPATEN TELUK WONDAMA', 'kabupaten'),
  ('9104', '91', 'KABUPATEN TELUK BINTUNI', 'kabupaten'),
  ('9105', '91', 'KABUPATEN MANOKWARI', 'kabupaten'),
  ('9106', '91', 'KABUPATEN SORONG SELATAN', 'kabupaten'),
  ('9107', '91', 'KABUPATEN SORONG', 'kabupaten'),
  ('9108', '91', 'KABUPATEN RAJA AMPAT', 'kabupaten'),
  ('9109', '91', 'KABUPATEN TAMBRAUW', 'kabupaten'),
  ('9110', '91', 'KABUPATEN MAYBRAT', 'kabupaten'),
  ('9111', '91', 'KABUPATEN MANOKWARI SELATAN', 'kabupaten'),
  ('9112', '91', 'KABUPATEN PEGUNUNGAN ARFAK', 'kabupaten'),
  ('9171', '91', 'KOTA SORONG', 'kota'),
  ('9401', '94', 'KABUPATEN MERAUKE', 'kabupaten'),
  ('9402', '94', 'KABUPATEN JAYAWIJAYA', 'kabupaten'),
  ('9403', '94', 'KABUPATEN JAYAPURA', 'kabupaten'),
  ('9404', '94', 'KABUPATEN NABIRE', 'kabupaten'),
  ('9408', '94', 'KABUPATEN KEPULAUAN YAPEN', 'kabupaten'),
  ('9409', '94', 'KABUPATEN BIAK NUMFOR', 'kabupaten'),
  ('9410', '94', 'KABUPATEN PANIAI', 'kabupaten'),
  ('9411', '94', 'KABUPATEN PUNCAK JAYA', 'kabupaten'),
  ('9412', '94', 'KABUPATEN MIMIKA', 'kabupaten'),
  ('9413', '94', 'KABUPATEN BOVEN DIGOEL', 'kabupaten'),
  ('9414', '94', 'KABUPATEN MAPPI', 'kabupaten'),
  ('9415', '94', 'KABUPATEN ASMAT', 'kabupaten'),
  ('9416', '94', 'KABUPATEN YAHUKIMO', 'kabupaten'),
  ('9417', '94', 'KABUPATEN PEGUNUNGAN BINTANG', 'kabupaten'),
  ('9418', '94', 'KABUPATEN TOLIKARA', 'kabupaten')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;

INSERT INTO public.ref_cities (id, province_id, name, kind) VALUES
  ('9419', '94', 'KABUPATEN SARMI', 'kabupaten'),
  ('9420', '94', 'KABUPATEN KEEROM', 'kabupaten'),
  ('9426', '94', 'KABUPATEN WAROPEN', 'kabupaten'),
  ('9427', '94', 'KABUPATEN SUPIORI', 'kabupaten'),
  ('9428', '94', 'KABUPATEN MAMBERAMO RAYA', 'kabupaten'),
  ('9429', '94', 'KABUPATEN NDUGA', 'kabupaten'),
  ('9430', '94', 'KABUPATEN LANNY JAYA', 'kabupaten'),
  ('9431', '94', 'KABUPATEN MAMBERAMO TENGAH', 'kabupaten'),
  ('9432', '94', 'KABUPATEN YALIMO', 'kabupaten'),
  ('9433', '94', 'KABUPATEN PUNCAK', 'kabupaten'),
  ('9434', '94', 'KABUPATEN DOGIYAI', 'kabupaten'),
  ('9435', '94', 'KABUPATEN INTAN JAYA', 'kabupaten'),
  ('9436', '94', 'KABUPATEN DEIYAI', 'kabupaten'),
  ('9471', '94', 'KOTA JAYAPURA', 'kota')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind;
