-- ============================================================================
-- 03_pricing_credits_assets.sql
-- Pricing packages, credit packages, and user file assets
-- Tables: pricing_packages, credit_packages, user_assets
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRICING_PACKAGES TABLE (Yearbook Pricing)
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

ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pricing" ON public.pricing_packages;
CREATE POLICY "Public read pricing" ON public.pricing_packages FOR SELECT USING (true);

-- Seed pricing packages
INSERT INTO public.pricing_packages (id, name, price_per_student, min_students, features) VALUES
  ('basic', 'Paket Basic', 85000, 100, ARRAY['Cover standar', '24 halaman', 'Foto kelas + individu', 'Soft copy']),
  ('standard', 'Paket Standard', 120000, 100, ARRAY['Cover pilihan', '32 halaman', 'Foto kelas + individu', 'Soft copy', 'Konsultasi 1x']),
  ('premium', 'Paket Premium', 165000, 80, ARRAY['Cover custom', '40 halaman', 'Semua foto + layout eksklusif', 'Soft copy + hard cover', 'Konsultasi 2x'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_per_student = EXCLUDED.price_per_student,
  min_students = EXCLUDED.min_students,
  features = EXCLUDED.features;

-- ----------------------------------------------------------------------------
-- CREDIT_PACKAGES TABLE (AI Feature Credits)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  credits integer NOT NULL,
  price bigint NOT NULL,
  popular boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read credit packages" ON public.credit_packages;
CREATE POLICY "Public read credit packages" ON public.credit_packages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage credit packages" ON public.credit_packages;
CREATE POLICY "Admin manage credit packages" ON public.credit_packages FOR ALL USING (
  public.check_is_global_admin()
);

-- Seed credit packages
INSERT INTO public.credit_packages (name, credits, price, popular)
SELECT 'Starter', 50, 50000, false
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages WHERE credits = 50)
UNION ALL
SELECT 'Popular', 100, 90000, true
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages WHERE credits = 100)
UNION ALL
SELECT 'Pro', 250, 200000, false
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages WHERE credits = 250)
UNION ALL
SELECT 'Enterprise', 500, 350000, false
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages WHERE credits = 500);

-- ----------------------------------------------------------------------------
-- USER_ASSETS TABLE (File Storage)
-- ----------------------------------------------------------------------------
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
