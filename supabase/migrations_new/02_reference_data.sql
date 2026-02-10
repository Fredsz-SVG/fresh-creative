-- ============================================================================
-- 02_reference_data.sql
-- Province and city reference data for Indonesia
-- Tables: ref_provinces, ref_cities
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REF_PROVINCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_provinces (
  id text NOT NULL,
  name text NOT NULL,
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  PRIMARY KEY (id)
);

-- Seed 34 provinces Indonesia
INSERT INTO public.ref_provinces (id, name) VALUES
  ('11', 'Aceh'),
  ('12', 'Sumatera Utara'),
  ('13', 'Sumatera Barat'),
  ('14', 'Riau'),
  ('15', 'Jambi'),
  ('16', 'Sumatera Selatan'),
  ('17', 'Bengkulu'),
  ('18', 'Lampung'),
  ('19', 'Kepulauan Bangka Belitung'),
  ('21', 'Kepulauan Riau'),
  ('31', 'DKI Jakarta'),
  ('32', 'Jawa Barat'),
  ('33', 'Jawa Tengah'),
  ('34', 'DI Yogyakarta'),
  ('35', 'Jawa Timur'),
  ('36', 'Banten'),
  ('51', 'Bali'),
  ('52', 'Nusa Tenggara Barat'),
  ('53', 'Nusa Tenggara Timur'),
  ('61', 'Kalimantan Barat'),
  ('62', 'Kalimantan Tengah'),
  ('63', 'Kalimantan Selatan'),
  ('64', 'Kalimantan Timur'),
  ('65', 'Kalimantan Utara'),
  ('71', 'Sulawesi Utara'),
  ('72', 'Sulawesi Tengah'),
  ('73', 'Sulawesi Selatan'),
  ('74', 'Sulawesi Tenggara'),
  ('75', 'Gorontalo'),
  ('76', 'Sulawesi Barat'),
  ('81', 'Maluku'),
  ('82', 'Maluku Utara'),
  ('91', 'Papua Barat'),
  ('94', 'Papua')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ----------------------------------------------------------------------------
-- REF_CITIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ref_cities (
  id text NOT NULL,
  province_id text NOT NULL REFERENCES public.ref_provinces(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'kota' CHECK (kind IN ('kota', 'kabupaten')),
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_ref_cities_province_id ON public.ref_cities(province_id);

-- Note: City data should be seeded separately via scripts/seed_ref_cities.mjs
-- This table will contain 500+ cities, keeping migration file size manageable
