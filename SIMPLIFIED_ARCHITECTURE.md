# Radio Cafe - Simplified Architecture

## Overview
The Radio Cafe app has been simplified to focus on core functionality:
- **Admin**: Adds music from YouTube URLs, system converts to MP3
- **Cafe Users**: See the same tracks that admin added, can play ready MP3 files
- **Single Database**: Both admin and cafe users see the same database - no manual sample songs
- **No Complex Downloads**: Removed downloading status, caching, and file management complexity

## Database Schema (Simplified)

### Tracks Table
```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_url TEXT NOT NULL UNIQUE,
  youtube_video_id TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- seconds
  mp3_file_url TEXT, -- Direct URL to MP3 file
  file_size BIGINT, -- bytes
  status TEXT CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Status Flow
1. **pending** - Admin added track, waiting for conversion
2. **processing** - System is converting YouTube audio to MP3
3. **ready** - MP3 is ready, cafe users can see and play it
4. **failed** - Conversion failed, error_message contains details

## Key Changes Made

### Removed Complexity
- ❌ `download_status` (pending/downloading/completed/failed)
- ❌ `audio_file_url` and `audio_file_path` separation
- ❌ `audio_format` field (always MP3 now)
- ❌ Complex download management and caching
- ❌ Hybrid storage switching between localStorage/Supabase

### Simplified To
- ✅ Single `status` field (pending/processing/ready/failed)
- ✅ Single `mp3_file_url` field for direct MP3 access
- ✅ Direct Supabase queries for ready tracks
- ✅ Simple admin interface for adding tracks
- ✅ Simple cafe interface for playing ready tracks

### Updated API Methods
- `RadioCafeService.getReadyTracks()` - Gets tracks with status='ready'
- `RadioCafeService.getAllTracks()` - Gets all tracks (admin view)
- `RadioCafeService.addTrack()` - Adds new track with status='pending'

### Views Created
- `ready_tracks` - What cafe users see (status='ready' only)
- `admin_tracks` - What admins see (all tracks with status info)

## Usage

### For Admin
1. Add YouTube URL with title/artist to the database
2. Track appears with status='pending' in the same database
3. Conversion service processes it → status='processing' 
4. When done → status='ready' (or 'failed' with error)

### For Cafe Users  
1. See the same database that admin uses
2. Only tracks with status='ready' are displayed
3. Click to play MP3 directly from `mp3_file_url`
4. No manual sample songs - empty until admin adds tracks
5. No downloading or caching complexity

## Migration
Run `/supabase/simplified-schema.sql` to update existing database to the new simplified structure.

## Benefits
- **Simpler codebase** - Easier to maintain and debug
- **Better UX** - Clear status flow for users
- **Easier deployment** - No complex file management
- **Direct playback** - MP3 files served directly via URL
- **Scalable** - Simple to extend with new features