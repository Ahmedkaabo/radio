-- Verification Script for Radio Cafe Database Schema
-- Run this to check if your database is properly configured

-- 1. Check if tracks table exists and has all required columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tracks'
ORDER BY ordinal_position;

-- 2. Check if admin_users table exists
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- 3. Verify indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('tracks', 'admin_users')
ORDER BY tablename, indexname;

-- 4. Check RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('tracks', 'admin_users');

-- 5. Check current track statistics
SELECT 
  COUNT(*) as total_tracks,
  COUNT(CASE WHEN download_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN download_status = 'downloading' THEN 1 END) as downloading,
  COUNT(CASE WHEN download_status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN download_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN download_status IS NULL THEN 1 END) as null_status
FROM tracks;

-- 6. Check admin users
SELECT role, passcode FROM admin_users ORDER BY role;

-- 7. Sample tracks with download info
SELECT 
  title,
  artist,
  youtube_video_id,
  download_status,
  audio_format,
  file_size,
  created_at
FROM tracks 
ORDER BY created_at DESC 
LIMIT 5;

-- Expected results:
-- ✅ tracks table should have: id, title, artist, youtube_url, youtube_video_id, 
--    thumbnail_url, duration, audio_file_url, audio_file_path, download_status, 
--    file_size, audio_format, created_at, updated_at
-- ✅ admin_users table should have: id, role, passcode, created_at
-- ✅ download_status should allow: 'pending', 'downloading', 'completed', 'failed'
-- ✅ Should have admin (1234) and cafe (5678) users