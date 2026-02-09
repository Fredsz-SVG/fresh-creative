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
