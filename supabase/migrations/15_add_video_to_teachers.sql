-- Add video_url field to album_teachers table
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add bio field for richer teacher profiles
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_album_teachers_created_by 
  ON album_teachers(created_by);
