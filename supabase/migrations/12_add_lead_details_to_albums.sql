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
