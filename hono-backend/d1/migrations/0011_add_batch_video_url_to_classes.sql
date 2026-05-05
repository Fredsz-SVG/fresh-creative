-- Add optional batch_video_url column to album_classes
-- This allows classes to have a featured video (e.g., class cinematic or message)
ALTER TABLE album_classes ADD COLUMN batch_video_url TEXT;
