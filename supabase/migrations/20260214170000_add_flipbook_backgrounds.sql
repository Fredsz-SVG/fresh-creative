-- Add Flipbook background columns to albums
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS flipbook_bg_cover text;
ALTER TABLE public.albums ADD COLUMN IF NOT EXISTS flipbook_bg_sambutan text;

-- Add Flipbook background column to album_classes
ALTER TABLE public.album_classes ADD COLUMN IF NOT EXISTS flipbook_bg_url text;
