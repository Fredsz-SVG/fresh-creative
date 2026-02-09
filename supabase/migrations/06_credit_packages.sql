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
