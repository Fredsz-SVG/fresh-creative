-- Add optional video_url column to portfolio_items
-- When present, the landing page "Full View" will show a video player instead of the photo
ALTER TABLE portfolio_items ADD COLUMN video_url TEXT;
