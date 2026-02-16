-- Add label column to flipbook_video_hotspots
alter table public.flipbook_video_hotspots add column if not exists label text;
