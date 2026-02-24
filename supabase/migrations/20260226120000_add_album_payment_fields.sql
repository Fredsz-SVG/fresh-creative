
-- Migration to add album payment fields
-- Created: 2026-02-26

BEGIN;

-- 1. Add payment columns to albums table
ALTER TABLE public.albums 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS payment_url text;

-- 2. Add album_id to transactions table to link payments to specific albums
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL;

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_album_id ON public.transactions(album_id);

COMMIT;
