-- ============================================================================
-- Migration: Flipbook, AI Labs Features, Popular badge, Feature Unlocks
-- ============================================================================

-- 1. Add new columns to pricing_packages
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS flipbook_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS ai_labs_features text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false;

-- 2. Add credits_per_unlock column to ai_feature_pricing
-- credits_per_use  = biaya per generate
-- credits_per_unlock = biaya untuk membuka (unlock) fitur per album
ALTER TABLE public.ai_feature_pricing ADD COLUMN IF NOT EXISTS credits_per_unlock integer NOT NULL DEFAULT 0 CHECK (credits_per_unlock >= 0);

-- 3. Feature unlocks table (personal unlock via credits)
CREATE TABLE IF NOT EXISTS public.feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id uuid NOT NULL,
  feature_type text NOT NULL CHECK (feature_type IN ('flipbook','tryon','pose','photogroup','phototovideo','image_remove_bg')),
  credits_spent integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, album_id, feature_type)
);

-- RLS for feature_unlocks
ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.feature_unlocks;
CREATE POLICY "Users can view own unlocks" ON public.feature_unlocks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own unlocks" ON public.feature_unlocks;
CREATE POLICY "Users can insert own unlocks" ON public.feature_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access unlocks" ON public.feature_unlocks;
CREATE POLICY "Service role full access unlocks" ON public.feature_unlocks
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Seed flipbook_unlock pricing
INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use, credits_per_unlock)
SELECT 'flipbook_unlock', 0, 50
WHERE NOT EXISTS (SELECT 1 FROM public.ai_feature_pricing WHERE feature_slug = 'flipbook_unlock');

-- 5. Set default unlock pricing for existing AI features
UPDATE public.ai_feature_pricing SET credits_per_unlock = 30 WHERE feature_slug = 'tryon' AND credits_per_unlock = 0;
UPDATE public.ai_feature_pricing SET credits_per_unlock = 30 WHERE feature_slug = 'pose' AND credits_per_unlock = 0;
UPDATE public.ai_feature_pricing SET credits_per_unlock = 20 WHERE feature_slug = 'photogroup' AND credits_per_unlock = 0;
UPDATE public.ai_feature_pricing SET credits_per_unlock = 20 WHERE feature_slug = 'phototovideo' AND credits_per_unlock = 0;
UPDATE public.ai_feature_pricing SET credits_per_unlock = 10 WHERE feature_slug = 'image_remove_bg' AND credits_per_unlock = 0;

-- 6. Set default values for existing premium package
UPDATE public.pricing_packages SET flipbook_enabled = true,
  ai_labs_features = ARRAY['tryon','pose','photogroup','phototovideo','image_remove_bg']
WHERE id = 'premium' AND flipbook_enabled = false;

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';