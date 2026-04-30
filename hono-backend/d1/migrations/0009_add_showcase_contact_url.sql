-- Add contactUrl field to showcase default JSON (safe update).
-- This only updates rows that still have the original default value.
UPDATE site_settings
SET value = '{"albumPreviews":[],"flipbookPreviewUrl":"","contactUrl":""}'
WHERE key = 'showcase'
  AND value = '{"albumPreviews":[],"flipbookPreviewUrl":""}';

