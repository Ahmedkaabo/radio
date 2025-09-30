-- =============================================
-- RADIO CAFE - SAFE DATABASE SCHEMA UPDATE
-- =============================================
-- This version safely updates existing tables without conflicts

-- =============================================
-- 1. CREATE ADMIN_USERS TABLE (IF NOT EXISTS)
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cafe')),
  passcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users (will skip if they already exist)
INSERT INTO admin_users (role, passcode) VALUES 
  ('admin', '1234'),  -- Admin can add/manage tracks
  ('cafe', '5678')    -- Cafe can only play tracks
ON CONFLICT (passcode) DO NOTHING;

-- =============================================
-- 2. CREATE TRACKS TABLE (IF NOT EXISTS)
-- =============================================
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic track info (from admin input)
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  
  -- Download status and file info
  download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  audio_file_path TEXT,
  audio_file_url TEXT,
  file_size BIGINT,
  duration INTEGER,
  audio_format TEXT DEFAULT 'mp3',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. ADD MISSING COLUMNS SAFELY
-- =============================================
DO $$ 
BEGIN
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

    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'duration') THEN
        ALTER TABLE tracks ADD COLUMN duration INTEGER;
    END IF;

    -- Add audio_format column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'audio_format') THEN
        ALTER TABLE tracks ADD COLUMN audio_format TEXT DEFAULT 'mp3';
    END IF;

    -- Add error_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'error_message') THEN
        ALTER TABLE tracks ADD COLUMN error_message TEXT;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tracks' AND column_name = 'updated_at') THEN
        ALTER TABLE tracks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- =============================================
-- 4. UPDATE EXISTING DATA
-- =============================================
-- Extract video IDs from existing YouTube URLs
UPDATE tracks 
SET youtube_video_id = CASE 
  WHEN youtube_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN 
    (regexp_match(youtube_url, 'v=([^&]+)'))[1]
  WHEN youtube_url ~ 'youtu\.be/([^?]+)' THEN 
    (regexp_match(youtube_url, 'youtu\.be/([^?]+)'))[1]
  ELSE NULL
END
WHERE youtube_video_id IS NULL AND youtube_url IS NOT NULL;

-- Generate thumbnail URLs from video IDs
UPDATE tracks 
SET thumbnail_url = CASE 
  WHEN youtube_video_id IS NOT NULL THEN 
    'https://img.youtube.com/vi/' || youtube_video_id || '/maxresdefault.jpg'
  ELSE NULL
END
WHERE thumbnail_url IS NULL AND youtube_video_id IS NOT NULL;

-- =============================================
-- 5. CREATE INDEXES (IF NOT EXISTS)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_download_status ON tracks(download_status);
CREATE INDEX IF NOT EXISTS idx_tracks_youtube_video_id ON tracks(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_tracks_youtube_url ON tracks(youtube_url);
CREATE INDEX IF NOT EXISTS idx_admin_users_passcode ON admin_users(passcode);

-- =============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CREATE/UPDATE POLICIES
-- =============================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations" ON admin_users;
DROP POLICY IF EXISTS "Allow all operations" ON tracks;
DROP POLICY IF EXISTS "Allow all operations on tracks" ON tracks;
DROP POLICY IF EXISTS "Allow read access to admin_users" ON admin_users;

-- Create new policies
CREATE POLICY "Allow all operations" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tracks FOR ALL USING (true);

-- =============================================
-- 8. CREATE/UPDATE TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_tracks_updated_at ON tracks;

-- Create the trigger
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. CREATE/UPDATE VIEWS
-- =============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS track_stats;
DROP VIEW IF EXISTS recent_tracks;
DROP VIEW IF EXISTS playable_tracks;

-- Track statistics view
CREATE VIEW track_stats AS
SELECT 
  COUNT(*) as total_tracks,
  COUNT(CASE WHEN download_status = 'completed' THEN 1 END) as completed_downloads,
  COUNT(CASE WHEN download_status = 'downloading' THEN 1 END) as active_downloads,
  COUNT(CASE WHEN download_status = 'failed' THEN 1 END) as failed_downloads,
  COUNT(CASE WHEN download_status = 'pending' THEN 1 END) as pending_downloads,
  COALESCE(SUM(file_size), 0) as total_storage_bytes,
  ROUND(COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0, 2) as total_storage_mb
FROM tracks;

-- Recent tracks view
CREATE VIEW recent_tracks AS
SELECT 
  id,
  title,
  artist,
  youtube_url,
  youtube_video_id,
  thumbnail_url,
  download_status,
  audio_file_url,
  file_size,
  duration,
  error_message,
  created_at
FROM tracks 
ORDER BY created_at DESC;

-- Ready to play tracks (for cafe interface)
CREATE VIEW playable_tracks AS
SELECT 
  id,
  title,
  artist,
  thumbnail_url,
  audio_file_url,
  duration,
  file_size,
  created_at
FROM tracks 
WHERE download_status = 'completed' 
  AND audio_file_url IS NOT NULL
ORDER BY created_at DESC;

-- =============================================
-- 10. VERIFICATION
-- =============================================
-- Check if everything is set up correctly
SELECT 
    'Setup completed successfully!' as status,
    (SELECT COUNT(*) FROM admin_users) as admin_users_count,
    (SELECT COUNT(*) FROM tracks) as tracks_count;

-- Show admin users
SELECT role, passcode, 'Ready to use' as status FROM admin_users;

-- Show track statistics
SELECT * FROM track_stats;