-- ============================================================================
-- Fresh Creative — skema utama (tanpa seed wilayah besar)
-- Urutan: 1) file ini  2) opsional: 0001_ref_indonesia_wilayah.sql
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
  full_name text,
  credits integer DEFAULT 0,
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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
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
--   2. Owner approves â†’ becomes member in album_members
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
-- Old flow: Generate invite token â†’ User clicks link â†’ Joins as admin/member
-- New flow: User joins as student â†’ Owner promotes to admin if needed
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
-- 1. Student registers via token â†’ album_join_requests (pending)
-- 2. Owner approves â†’ inserts to BOTH:
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
-- Baseline bagian 2/2 (dulu banyak file terpisah): transaksi, album payment,
-- AI pricing, redeem, suspend user, admin realtime users, realtime publik.
-- Jalankan setelah skema utama (file migration sebelumnya).
-- ============================================================================

-- Fitur "File Saya" — tabel dihapus jika masih ada dari proyek lama
DROP TABLE IF EXISTS public.user_assets CASCADE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_assets;
  END IF;
END $$;

-- Transaksi (Xendit / paket kredit)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL UNIQUE,
  package_id uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SETTLED', 'EXPIRED', 'FAILED')),
  invoice_url text,
  payment_method text,
  paid_at timestamptz,
  description text,
  new_students_count integer,
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_transactions_album_id ON public.transactions(album_id);

DROP TRIGGER IF EXISTS set_transactions_timestamp ON public.transactions;
CREATE TRIGGER set_transactions_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_timestamp();

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all transactions" ON public.transactions;
CREATE POLICY "Admins can read all transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Pembayaran album
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_url text;

ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_payment_status_check;
UPDATE public.albums SET payment_status = 'unpaid' WHERE payment_status IS NULL OR payment_status NOT IN ('unpaid', 'paid');
UPDATE public.albums a SET payment_status = 'paid'
WHERE a.payment_status = 'unpaid'
  AND EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.album_id = a.id AND t.status IN ('PAID', 'SETTLED')
  );
ALTER TABLE public.albums
  ADD CONSTRAINT albums_payment_status_check CHECK (payment_status IN ('unpaid', 'paid'));
ALTER TABLE public.albums ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- AI Labs — harga kredit
CREATE TABLE IF NOT EXISTS public.ai_feature_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_slug text NOT NULL UNIQUE,
  credits_per_use integer NOT NULL DEFAULT 0 CHECK (credits_per_use >= 0),
  credits_per_unlock integer NOT NULL DEFAULT 0 CHECK (credits_per_unlock >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_ai_feature_pricing_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ai_feature_pricing_updated_at ON public.ai_feature_pricing;
CREATE TRIGGER set_ai_feature_pricing_updated_at
  BEFORE UPDATE ON public.ai_feature_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_feature_pricing_updated_at();

ALTER TABLE public.ai_feature_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.ai_feature_pricing;
DROP POLICY IF EXISTS "Allow all modification" ON public.ai_feature_pricing;
CREATE POLICY "Allow public read access" ON public.ai_feature_pricing FOR SELECT USING (true);
CREATE POLICY "Allow all modification" ON public.ai_feature_pricing FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use, credits_per_unlock)
VALUES
  ('tryon', 1, 30),
  ('pose', 1, 30),
  ('photogroup', 1, 20),
  ('phototovideo', 1, 20),
  ('image_remove_bg', 1, 10),
  ('flipbook_unlock', 0, 50)
ON CONFLICT (feature_slug) DO UPDATE SET
  credits_per_use = EXCLUDED.credits_per_use,
  credits_per_unlock = EXCLUDED.credits_per_unlock;

ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS flipbook_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS ai_labs_features text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

UPDATE public.pricing_packages SET
  flipbook_enabled = true,
  ai_labs_features = ARRAY['tryon', 'pose', 'photogroup', 'phototovideo', 'image_remove_bg']
WHERE id = 'premium';

-- Unlock fitur per album
CREATE TABLE IF NOT EXISTS public.feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  feature_type text NOT NULL CHECK (
    feature_type IN ('flipbook', 'tryon', 'pose', 'photogroup', 'phototovideo', 'image_remove_bg')
  ),
  credits_spent integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, album_id, feature_type)
);

ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own unlocks" ON public.feature_unlocks;
CREATE POLICY "Users can view own unlocks" ON public.feature_unlocks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own unlocks" ON public.feature_unlocks;
CREATE POLICY "Users can insert own unlocks" ON public.feature_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access unlocks" ON public.feature_unlocks;
CREATE POLICY "Service role full access unlocks" ON public.feature_unlocks FOR ALL USING (true) WITH CHECK (true);

-- Kode redeem kredit
CREATE TABLE IF NOT EXISTS public.redeem_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credits integer NOT NULL CHECK (credits > 0),
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.redeem_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redeem_code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_received integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(redeem_code_id, user_id)
);

CREATE OR REPLACE FUNCTION public.set_redeem_codes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_redeem_codes_updated_at ON public.redeem_codes;
CREATE TRIGGER set_redeem_codes_updated_at
  BEFORE UPDATE ON public.redeem_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_redeem_codes_updated_at();

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeem_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active codes" ON public.redeem_codes;
CREATE POLICY "Public read active codes" ON public.redeem_codes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access codes" ON public.redeem_codes;
CREATE POLICY "Service role full access codes" ON public.redeem_codes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redeem_history;
CREATE POLICY "Users can view own redemptions" ON public.redeem_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access history" ON public.redeem_history;
CREATE POLICY "Service role full access history" ON public.redeem_history FOR ALL USING (true) WITH CHECK (true);

-- Suspensi akun + admin baca semua users (Realtime admin panel)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON public.users(is_suspended);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT USING (public.check_is_global_admin());

ALTER TABLE public.album_teachers DROP CONSTRAINT IF EXISTS album_teachers_created_by_fkey;
ALTER TABLE public.album_teachers
  ADD CONSTRAINT album_teachers_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Daftarkan semua tabel public ke supabase_realtime (satu blok, mengganti migrasi terpisah)
DO $$
DECLARE
  rec RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOR rec IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rec.tablename);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN OTHERS THEN
        RAISE NOTICE 'Skip realtime registration for %: %', rec.tablename, SQLERRM;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
