-- ============================================================================
-- Migration: Redeem Codes for Credits
-- ============================================================================

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

-- Track who redeemed what
CREATE TABLE IF NOT EXISTS public.redeem_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redeem_code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_received integer NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(redeem_code_id, user_id)
);

-- Auto-update updated_at
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

-- RLS
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeem_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active codes" ON public.redeem_codes;
CREATE POLICY "Public read active codes" ON public.redeem_codes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access codes" ON public.redeem_codes;
CREATE POLICY "Service role full access codes" ON public.redeem_codes
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redeem_history;
CREATE POLICY "Users can view own redemptions" ON public.redeem_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access history" ON public.redeem_history;
CREATE POLICY "Service role full access history" ON public.redeem_history
  FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
