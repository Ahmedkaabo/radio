-- Radio Cafe Schema Updates
-- Run these SQL commands in your Supabase SQL editor to ensure full download functionality

-- 1. First, check if the tracks table exists and has all required columns
-- If the table doesn't exist, create it with all columns
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  audio_file_url TEXT,
  audio_file_path TEXT,
  download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  file_size BIGINT,
  audio_format TEXT DEFAULT 'mp3',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns if they don't exist (safe to run multiple times)
DO $$ 
BEGIN
    -- Add download_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'download_status') THEN
        ALTER TABLE tracks ADD COLUMN download_status TEXT DEFAULT 'pending' 
        CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed'));
    END IF;

    -- Add audio_file_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'audio_file_url') THEN
        ALTER TABLE tracks ADD COLUMN audio_file_url TEXT;
    END IF;

    -- Add audio_file_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'audio_file_path') THEN
        ALTER TABLE tracks ADD COLUMN audio_file_path TEXT;
    END IF;

    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'file_size') THEN
        ALTER TABLE tracks ADD COLUMN file_size BIGINT;
    END IF;

    -- Add audio_format column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'audio_format') THEN
        ALTER TABLE tracks ADD COLUMN audio_format TEXT DEFAULT 'mp3';
    END IF;

    -- Add youtube_video_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'youtube_video_id') THEN
        ALTER TABLE tracks ADD COLUMN youtube_video_id TEXT;
    END IF;

    -- Add thumbnail_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE tracks ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'duration') THEN
        ALTER TABLE tracks ADD COLUMN duration INTEGER;
    END IF;
END $$;

-- 3. Create admin_users table for authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cafe')),
  passcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default admin users
INSERT INTO admin_users (role, passcode) VALUES 
  ('admin', '1234'),
  ('cafe', '5678')
ON CONFLICT (passcode) DO NOTHING;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_youtube_video_id ON tracks(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);
CREATE INDEX IF NOT EXISTS idx_tracks_youtube_url ON tracks(youtube_url);
CREATE INDEX IF NOT EXISTS idx_admin_users_passcode ON admin_users(passcode);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (allow all operations for passcode auth system)
DROP POLICY IF EXISTS "Allow all operations on tracks" ON tracks;
CREATE POLICY "Allow all operations on tracks" ON tracks
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read access to admin_users" ON admin_users;
CREATE POLICY "Allow read access to admin_users" ON admin_users
  FOR SELECT USING (true);

-- 8. Create or update the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks 
  FOR each ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Update existing tracks to have proper youtube_video_id if missing
UPDATE tracks 
SET youtube_video_id = CASE 
  WHEN youtube_url LIKE '%youtube.com/watch?v=%' THEN 
    substring(youtube_url from 'v=([^&]+)')
  WHEN youtube_url LIKE '%youtu.be/%' THEN 
    substring(youtube_url from 'youtu.be/([^?]+)')
  ELSE youtube_video_id
END
WHERE youtube_video_id IS NULL AND youtube_url IS NOT NULL;

-- 11. Insert sample tracks if none exist
INSERT INTO tracks (title, artist, youtube_url, youtube_video_id, thumbnail_url, duration, download_status) 
SELECT * FROM (VALUES 
  (
    'Smooth Jazz Cafe', 
    'Demo Artist', 
    'https://youtube.com/watch?v=demo1',
    'demo1',
    'https://img.youtube.com/vi/demo1/maxresdefault.jpg',
    204,
    'pending'
  ),
  (
    'Ambient Lounge', 
    'Chill Collective', 
    'https://youtube.com/watch?v=demo2',
    'demo2',
    'https://img.youtube.com/vi/demo2/maxresdefault.jpg',
    252,
    'pending'
  ),
  (
    'Bossa Nova Dreams', 
    'Latin Vibes', 
    'https://youtube.com/watch?v=demo3',
    'demo3',
    'https://img.youtube.com/vi/demo3/maxresdefault.jpg',
    178,
    'pending'
  )
) AS sample_data(title, artist, youtube_url, youtube_video_id, thumbnail_url, duration, download_status)
WHERE NOT EXISTS (SELECT 1 FROM tracks LIMIT 1)
ON CONFLICT (youtube_url) DO NOTHING;

-- 12. Create a helpful view for track statistics
CREATE OR REPLACE VIEW track_stats AS
SELECT 
  COUNT(*) as total_tracks,
  COUNT(CASE WHEN download_status = 'completed' THEN 1 END) as completed_downloads,
  COUNT(CASE WHEN download_status = 'downloading' THEN 1 END) as active_downloads,
  COUNT(CASE WHEN download_status = 'failed' THEN 1 END) as failed_downloads,
  COUNT(CASE WHEN download_status = 'pending' THEN 1 END) as pending_downloads,
  COALESCE(SUM(file_size), 0) as total_storage_bytes,
  ROUND(COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0, 2) as total_storage_mb
FROM tracks;

-- 13. Grant necessary permissions (adjust schema as needed)
GRANT ALL ON tracks TO authenticated;
GRANT ALL ON admin_users TO authenticated;
GRANT SELECT ON track_stats TO authenticated;

-- Verification queries (run these to check the schema)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'tracks' 
-- ORDER BY ordinal_position;

-- SELECT * FROM track_stats;

-- SELECT COUNT(*) as track_count FROM tracks;