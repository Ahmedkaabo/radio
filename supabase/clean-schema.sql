-- =============================================
-- RADIO CAFE - CLEAN DATABASE SCHEMA
-- =============================================
-- This is a simplified, clean schema for the radio cafe system
-- Core functionality: Admin adds YouTube URLs → Download M4A → Cafe plays offline

-- =============================================
-- 1. ADMIN USERS TABLE
-- =============================================
-- Simple authentication with passcodes
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cafe')),
  passcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users
INSERT INTO admin_users (role, passcode) VALUES 
  ('admin', '1234'),  -- Admin can add/manage tracks
  ('cafe', '5678');   -- Cafe can only play tracks

-- =============================================
-- 2. TRACKS TABLE
-- =============================================
-- Core table for managing YouTube tracks and their download status
CREATE TABLE tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic track info (from admin input)
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN youtube_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN 
        (regexp_match(youtube_url, 'v=([^&]+)'))[1]
      WHEN youtube_url ~ 'youtu\.be/([^?]+)' THEN 
        (regexp_match(youtube_url, 'youtu\.be/([^?]+)'))[1]
      ELSE NULL
    END
  ) STORED,
  
  -- Auto-generated thumbnail URL
  thumbnail_url TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN youtube_url ~ 'youtube\.com/watch\?v=([^&]+)' THEN 
        'https://img.youtube.com/vi/' || (regexp_match(youtube_url, 'v=([^&]+)'))[1] || '/maxresdefault.jpg'
      WHEN youtube_url ~ 'youtu\.be/([^?]+)' THEN 
        'https://img.youtube.com/vi/' || (regexp_match(youtube_url, 'youtu\.be/([^?]+)'))[1] || '/maxresdefault.jpg'
      ELSE NULL
    END
  ) STORED,
  
  -- Download status and file info
  download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  audio_file_path TEXT,          -- Local path: /downloads/track-id.m4a
  audio_file_url TEXT,           -- Public URL: /downloads/track-id.m4a
  file_size BIGINT,              -- File size in bytes
  duration INTEGER,              -- Duration in seconds (extracted during download)
  audio_format TEXT DEFAULT 'm4a',
  
  -- Error handling
  error_message TEXT,            -- Store error details if download fails
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_download_status ON tracks(download_status);
CREATE INDEX idx_tracks_youtube_video_id ON tracks(youtube_video_id);

-- =============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Allow all operations (we'll handle auth in the app layer with passcodes)
CREATE POLICY "Allow all operations" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tracks FOR ALL USING (true);

-- =============================================
-- 5. AUTOMATIC UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. HELPFUL VIEWS FOR MONITORING
-- =============================================

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
-- 7. SAMPLE DATA (OPTIONAL)
-- =============================================
-- Uncomment the following to add some sample tracks for testing

/*
INSERT INTO tracks (title, artist, youtube_url) VALUES 
  ('Lofi Hip Hop Mix', 'ChillHop Music', 'https://www.youtube.com/watch?v=jfKfPfyJRdk'),
  ('Jazz Cafe Playlist', 'Smooth Jazz', 'https://www.youtube.com/watch?v=Dx5qFachd3A'),
  ('Ambient Study Music', 'Focus Beats', 'https://www.youtube.com/watch?v=5qap5aO4i9A');
*/

-- =============================================
-- 8. VERIFICATION QUERIES
-- =============================================
-- Run these queries to verify your setup:

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'tracks' 
-- ORDER BY ordinal_position;

-- Check sample data
-- SELECT * FROM track_stats;
-- SELECT * FROM recent_tracks LIMIT 5;

-- Test user authentication
-- SELECT role FROM admin_users WHERE passcode = '1234';  -- Should return 'admin'
-- SELECT role FROM admin_users WHERE passcode = '5678';  -- Should return 'cafe'