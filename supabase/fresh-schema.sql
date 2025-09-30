-- Fresh Radio Cafe Database Schema - Minimal Approach
-- Run this SQL in your Supabase SQL editor

-- Drop everything and start fresh
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP VIEW IF EXISTS ready_tracks CASCADE;
DROP VIEW IF EXISTS admin_tracks CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Simple tracks table - one source of truth
CREATE TABLE tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN youtube_url ~ 'youtube\.com/watch\?v=([^&\n?#]+)' THEN 
        substring(youtube_url from 'youtube\.com/watch\?v=([^&\n?#]+)')
      WHEN youtube_url ~ 'youtu\.be/([^&\n?#]+)' THEN 
        substring(youtube_url from 'youtu\.be/([^&\n?#]+)')
      ELSE NULL
    END
  ) STORED,
  thumbnail_url TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN youtube_url ~ 'youtube\.com/watch\?v=([^&\n?#]+)' THEN 
        'https://img.youtube.com/vi/' || substring(youtube_url from 'youtube\.com/watch\?v=([^&\n?#]+)') || '/maxresdefault.jpg'
      WHEN youtube_url ~ 'youtu\.be/([^&\n?#]+)' THEN 
        'https://img.youtube.com/vi/' || substring(youtube_url from 'youtu\.be/([^&\n?#]+)') || '/maxresdefault.jpg'
      ELSE 'https://via.placeholder.com/480x360/6366f1/white?text=Music'
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple admin users table
CREATE TABLE admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cafe')),
  passcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert admin credentials
INSERT INTO admin_users (role, passcode) VALUES 
  ('admin', '1234'),
  ('cafe', '5678');

-- Create indexes
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_admin_users_passcode ON admin_users(passcode);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Auto-update trigger
CREATE TRIGGER update_tracks_updated_at 
  BEFORE UPDATE ON tracks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for now (using passcode auth)
CREATE POLICY "Allow all operations on tracks" ON tracks FOR ALL USING (true);
CREATE POLICY "Allow read access to admin_users" ON admin_users FOR SELECT USING (true);