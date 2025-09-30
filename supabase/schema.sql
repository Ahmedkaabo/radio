-- Radio Cafe Database Schema
-- Run this SQL in your Supabase SQL editor

-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- Duration in seconds
  audio_file_url TEXT, -- URL to downloaded audio file
  audio_file_path TEXT, -- Local file path for downloaded audio
  download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
  file_size BIGINT, -- File size in bytes
  audio_format TEXT DEFAULT 'mp3', -- Audio format (mp3, m4a, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table for passcode authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cafe')),
  passcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin users
INSERT INTO admin_users (role, passcode) VALUES 
  ('admin', '1234'),
  ('cafe', '5678')
ON CONFLICT (passcode) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_youtube_video_id ON tracks(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_passcode ON admin_users(passcode);

-- Enable Row Level Security (RLS)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tracks policies (allow all operations for now since we're using passcode auth)
CREATE POLICY "Allow all operations on tracks" ON tracks
  FOR ALL USING (true);

-- Admin users policies (allow read for authentication)
CREATE POLICY "Allow read access to admin_users" ON admin_users
  FOR SELECT USING (true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample tracks for demo
INSERT INTO tracks (title, artist, youtube_url, youtube_video_id, thumbnail_url, duration) VALUES 
  (
    'Smooth Jazz Cafe', 
    'Demo Artist', 
    'https://youtube.com/watch?v=demo1',
    'demo1',
    'https://img.youtube.com/vi/demo1/maxresdefault.jpg',
    204
  ),
  (
    'Ambient Lounge', 
    'Chill Collective', 
    'https://youtube.com/watch?v=demo2',
    'demo2',
    'https://img.youtube.com/vi/demo2/maxresdefault.jpg',
    252
  ),
  (
    'Bossa Nova Dreams', 
    'Latin Vibes', 
    'https://youtube.com/watch?v=demo3',
    'demo3',
    'https://img.youtube.com/vi/demo3/maxresdefault.jpg',
    178
  )
ON CONFLICT (youtube_url) DO NOTHING;