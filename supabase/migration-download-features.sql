-- Essential Schema Updates for Radio Cafe Download Functionality
-- Run this in your Supabase SQL editor

-- Add download-related columns to existing tracks table
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS download_status TEXT DEFAULT 'pending' 
CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed'));

ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS audio_file_url TEXT;

ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS audio_file_path TEXT;

ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS audio_format TEXT DEFAULT 'm4a';

-- Create index for download status queries
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);

-- Update existing tracks to have proper download status
UPDATE tracks 
SET download_status = 'pending' 
WHERE download_status IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tracks' 
AND column_name IN ('download_status', 'audio_file_url', 'audio_file_path', 'file_size', 'audio_format');