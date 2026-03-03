// Run the migration directly via Supabase admin RPC
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Step 1: Add flipbook_enabled column
  const { error: e1 } = await supabase.rpc('exec_sql', {
    query: `ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS flipbook_enabled boolean NOT NULL DEFAULT false;`
  })
  if (e1) {
    console.log('Step 1 via RPC failed (expected if exec_sql not available):', e1.message)
    console.log('\n⚠️  Kamu harus jalankan SQL ini LANGSUNG di Supabase Dashboard → SQL Editor:\n')
    console.log(`
-- COPY PASTE SEMUA INI KE SUPABASE SQL EDITOR DAN KLIK RUN:

ALTER TABLE public.pricing_packages
  ADD COLUMN IF NOT EXISTS flipbook_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.pricing_packages
  ADD COLUMN IF NOT EXISTS ai_labs_features text[] NOT NULL DEFAULT '{}';

UPDATE public.pricing_packages SET flipbook_enabled = true, ai_labs_features = ARRAY['tryon','pose','photogroup','phototovideo','image_remove_bg'] WHERE id = 'premium';

INSERT INTO public.ai_feature_pricing (feature_slug, credits_per_use)
VALUES ('flipbook_unlock', 50)
ON CONFLICT (feature_slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  feature_type text NOT NULL CHECK (feature_type IN ('flipbook', 'tryon', 'pose', 'photogroup', 'phototovideo', 'image_remove_bg')),
  credits_spent integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, album_id, feature_type)
);

CREATE INDEX IF NOT EXISTS idx_feature_unlocks_user_album ON public.feature_unlocks(user_id, album_id);
CREATE INDEX IF NOT EXISTS idx_feature_unlocks_album ON public.feature_unlocks(album_id);

ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own unlocks" ON public.feature_unlocks;
CREATE POLICY "Users can read own unlocks" ON public.feature_unlocks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage unlocks" ON public.feature_unlocks;
CREATE POLICY "Service role can manage unlocks" ON public.feature_unlocks
  FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
`)
    return
  }
  console.log('✅ Migration ran successfully via RPC')
}

main()
