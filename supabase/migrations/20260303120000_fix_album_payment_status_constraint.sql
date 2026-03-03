
-- Fix payment_status constraint on albums table
-- Restores albums that were wrongly set to 'unpaid'
-- Also adds description column to transactions for upgrade labels

BEGIN;

-- 1. Drop existing constraint
ALTER TABLE public.albums DROP CONSTRAINT IF EXISTS albums_payment_status_check;

-- 2. Fix existing rows: set any NULL or invalid payment_status to 'unpaid'
UPDATE public.albums 
SET payment_status = 'unpaid' 
WHERE payment_status IS NULL 
   OR payment_status NOT IN ('unpaid', 'paid');

-- 3. Restore albums that have successful payments but were wrongly reset to 'unpaid'
UPDATE public.albums 
SET payment_status = 'paid' 
WHERE payment_status = 'unpaid' 
  AND id IN (
    SELECT DISTINCT album_id FROM public.transactions 
    WHERE album_id IS NOT NULL 
      AND status IN ('PAID', 'SETTLED')
  );

-- 4. Set default
ALTER TABLE public.albums 
ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- 5. Re-add the constraint
ALTER TABLE public.albums 
ADD CONSTRAINT albums_payment_status_check 
CHECK (payment_status IN ('unpaid', 'paid'));

-- 6. Add description and new_students_count columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS new_students_count integer;

COMMIT;
