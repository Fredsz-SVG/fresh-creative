-- Run this in Supabase SQL Editor to create the table for showcase (preview) settings.
-- Used by GET /api/showcase and PUT /api/admin/showcase.

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'
);

-- Insert default showcase so GET returns empty previews until admin sets them
INSERT INTO site_settings (key, value)
VALUES ('showcase', '{"albumPreviews":[],"flipbookPreviewUrl":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
