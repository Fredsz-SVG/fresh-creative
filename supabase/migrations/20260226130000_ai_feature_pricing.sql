-- ----------------------------------------------------------------------------
-- AI Feature Pricing
-- Menyimpan harga (credit per generate) untuk tiap fitur AI Labs
-- ----------------------------------------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_feature_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_slug text NOT NULL UNIQUE,
  credits_per_use integer NOT NULL DEFAULT 0 CHECK (credits_per_use >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_ai_feature_pricing_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ai_feature_pricing_updated_at ON public.ai_feature_pricing;

CREATE TRIGGER set_ai_feature_pricing_updated_at
BEFORE UPDATE ON public.ai_feature_pricing
FOR EACH ROW
EXECUTE FUNCTION public.set_ai_feature_pricing_updated_at();

ALTER TABLE public.ai_feature_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.ai_feature_pricing;
DROP POLICY IF EXISTS "Allow all modification" ON public.ai_feature_pricing;

CREATE POLICY "Allow public read access" ON public.ai_feature_pricing
  FOR SELECT USING (true);

CREATE POLICY "Allow all modification" ON public.ai_feature_pricing
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
SELECT 'tryon', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'tryon');

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
SELECT 'pose', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'pose');

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
SELECT 'photogroup', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'photogroup');

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
SELECT 'phototovideo', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'phototovideo');

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
SELECT 'image_remove_bg', 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'image_remove_bg');

COMMIT;

