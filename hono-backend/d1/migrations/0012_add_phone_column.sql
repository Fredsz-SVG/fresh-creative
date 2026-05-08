-- Add optional phone column to album_class_access
-- This supports WhatsApp contact links in member profiles
ALTER TABLE album_class_access ADD COLUMN phone TEXT;
