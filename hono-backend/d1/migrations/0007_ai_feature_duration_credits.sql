-- Tiered credits per duration (JSON) for features like Photo to Video (phototovideo).
-- Example: {"5":1,"10":2,"12":3} — keys are seconds (stringified), values are credit cost.

ALTER TABLE ai_feature_pricing ADD COLUMN duration_credits_json TEXT;

UPDATE ai_feature_pricing
SET duration_credits_json =
  '{"5":' || CAST(credits_per_use AS TEXT) || ',"10":' || CAST(credits_per_use AS TEXT) || '}'
WHERE feature_slug = 'phototovideo'
  AND (duration_credits_json IS NULL OR TRIM(COALESCE(duration_credits_json, '')) = '');
