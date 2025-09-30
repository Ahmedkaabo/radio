-- Simplified Radio Cafe Database Schema
-- Run this SQL in your Supabase SQL editor to update the database

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create simplified tracks table
CREATE TABLE tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- Duration in seconds
  mp3_file_url TEXT, -- Direct URL to the MP3 file
  file_size BIGINT, -- File size in bytes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table for passcode authentication
CREATE TABLE admin_users (
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
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_youtube_video_id ON tracks(youtube_video_id);
CREATE INDEX idx_admin_users_passcode ON admin_users(passcode);

-- Enable Row Level Security (RLS)
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for now since we're using passcode auth
CREATE POLICY "Allow all operations on tracks" ON tracks
  FOR ALL USING (true);

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

-- Insert some sample tracks for demo (these would be processed by the conversion service)
INSERT INTO tracks (title, artist, youtube_url, youtube_video_id, thumbnail_url, duration, mp3_file_url, file_size, status) VALUES 
  (
    'Smooth Jazz Cafe', 
    'Demo Artist', 
    'https://youtube.com/watch?v=demo1',
    'demo1',
    'https://img.youtube.com/vi/demo1/maxresdefault.jpg',
    204,
    '/api/stream/demo1.mp3',
    5242880,
    'ready'
  ),
  (
    'Ambient Lounge', 
    'Chill Collective', 
    'https://youtube.com/watch?v=demo2',
    'demo2',
    'https://img.youtube.com/vi/demo2/maxresdefault.jpg',
    252,
    '/api/stream/demo2.mp3',
    6815744,
    'ready'
  ),
  (
    'Bossa Nova Dreams', 
    'Latin Vibes', 
    'https://youtube.com/watch?v=demo3',
    'demo3',
    'https://img.youtube.com/vi/demo3/maxresdefault.jpg',
    178,
    '/api/stream/demo3.mp3',
    4194304,
    'ready'
  )
ON CONFLICT (youtube_url) DO NOTHING;

-- View for getting ready tracks (what cafe users see)
CREATE OR REPLACE VIEW ready_tracks AS
SELECT 
  id,
  title,
  artist,
  youtube_url,
  youtube_video_id,
  thumbnail_url,
  duration,
  mp3_file_url,
  file_size,
  created_at,
  updated_at
FROM tracks 
WHERE status = 'ready'
ORDER BY created_at DESC;

-- View for admin dashboard with all tracks and statuses
CREATE OR REPLACE VIEW admin_tracks AS
SELECT 
  id,
  title,
  artist,
  youtube_url,
  youtube_video_id,
  thumbnail_url,
  duration,
  mp3_file_url,
  file_size,
  status,
  error_message,
  created_at,
  updated_at
FROM tracks 
ORDER BY created_at DESC;