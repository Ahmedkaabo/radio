# 🎵 Radio Cafe - Complete Setup Guide

## Overview
Radio Cafe is a system where admin users can add YouTube URLs, download them as M4A audio files, and cafe users can play them offline.

## 🏗️ Architecture
- **Admin Interface**: Add YouTube URLs, trigger downloads, manage tracks
- **Download Service**: Uses `yt-dlp` to download M4A files locally
- **Cafe Interface**: Play downloaded tracks offline
- **Storage**: Files stored in `/public/downloads/`, metadata in Supabase

## 🚀 Quick Start

### 1. Database Setup
Run this SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase/clean-schema.sql
```

### 2. Environment Variables
Make sure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies
```bash
npm install
# Make sure yt-dlp is installed
python3 -m pip install yt-dlp
```

### 4. Start the Application
```bash
npm run dev
```

## 🔐 User Authentication
- **Admin**: Passcode `1234`
- **Cafe**: Passcode `5678`

## 📋 User Flow

### Admin Workflow:
1. Login with passcode `1234`
2. Add YouTube URL + Title + Artist
3. Click "Download" button on pending tracks
4. Monitor download status (pending → downloading → completed/failed)

### Cafe Workflow:
1. Login with passcode `5678`
2. Browse completed tracks in playlist
3. Select and play tracks offline
4. Use player controls (play/pause/next/previous/shuffle/repeat)

## 🛠️ Technical Details

### File Storage:
- Downloaded files: `/public/downloads/{track-id}.m4a`
- Accessible via: `http://localhost:3000/downloads/{track-id}.m4a`

### Download Process:
1. Admin adds track → Status: `pending`
2. Admin clicks download → Status: `downloading`
3. `yt-dlp` downloads M4A file → Status: `completed`
4. If error occurs → Status: `failed` (with error message)

### API Endpoints:
- `POST /api/download-audio` - Download a track
- `GET /api/download-audio?trackId=X` - Check download status

## 🔧 Key Features

### Admin Dashboard:
- ✅ Add YouTube tracks with metadata
- ✅ Real-time download status tracking
- ✅ Statistics overview (total/pending/completed/failed)
- ✅ Track management (edit/delete)
- ✅ Auto-refresh every 5 seconds

### Cafe Player:
- ✅ Beautiful music player interface  
- ✅ Play only completed downloads
- ✅ Shuffle and repeat modes
- ✅ Volume control and seek bar
- ✅ Auto-refresh playlist every 30 seconds

### Download Service:
- ✅ Uses `yt-dlp` for reliable downloads
- ✅ Extracts metadata (duration, file size)
- ✅ Error handling and status updates
- ✅ M4A format for compatibility

## 🐛 Troubleshooting

### Downloads Failing?
1. Check if `yt-dlp` is installed: `python3 -m yt_dlp --version`
2. Check file permissions on `/public/downloads/`
3. Verify YouTube URL is valid and accessible

### Database Issues?
1. Ensure Supabase connection is working
2. Check if schema was created properly
3. Verify RLS policies are set correctly

### Audio Not Playing?
1. Check if file exists in `/public/downloads/`
2. Verify track status is `completed`
3. Check browser console for errors

## 📁 File Structure
```
src/
├── app/
│   ├── admin/page.tsx          # Admin dashboard
│   ├── cafe/page.tsx           # Cafe player
│   ├── login/page.tsx          # Authentication
│   └── api/
│       └── download-audio/     # Download API
├── lib/
│   └── radio-cafe-service.ts   # Main service layer
└── supabase/
    └── clean-schema.sql        # Database schema
```

## 🎯 Next Steps
1. **Apply the database schema** to your Supabase project
2. **Test the admin flow**: Add a YouTube track and download it
3. **Test the cafe flow**: Play the downloaded track
4. **Customize**: Update UI, add features, deploy to production

## 🚀 Ready to Use!
Your Radio Cafe system is ready! Login as admin (1234) to add music, or as cafe (5678) to enjoy your offline music collection.