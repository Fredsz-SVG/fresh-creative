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
