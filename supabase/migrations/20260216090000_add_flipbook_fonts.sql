-- Add font styling columns to albums table for Sambutan section
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS sambutan_font_family text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS sambutan_title_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS sambutan_text_color text DEFAULT '#000000';

-- Add font styling columns to classes table tor Flipbook view
ALTER TABLE album_classes
ADD COLUMN IF NOT EXISTS flipbook_font_family text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS flipbook_title_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS flipbook_text_color text DEFAULT '#000000';
