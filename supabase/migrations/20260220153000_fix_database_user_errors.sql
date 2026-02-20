-- ============================================================================
-- Fixes for User Creation and Deletion Errors
-- Run this in the Supabase SQL Editor to apply fixes to your existing database.
-- ============================================================================

BEGIN;

-- 1. Ensure `full_name` column exists on `public.users` table
-- This prevents the "Database error saving new user" when signing up
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.users ADD COLUMN full_name text;
    END IF;
END $$;

-- 2. Prevent Foreign Key Constraint violation on User Deletion
-- This prevents "Database error deleting user" by setting created_by to NULL
-- instead of blocking the deletion operation.

-- First, drop the existing foreign key constraint
ALTER TABLE public.album_teachers 
  DROP CONSTRAINT IF EXISTS album_teachers_created_by_fkey;

-- Then, add it back with ON DELETE SET NULL
ALTER TABLE public.album_teachers
  ADD CONSTRAINT album_teachers_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
