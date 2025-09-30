# 🚀 Supabase Storage Deployment Guide

## ✅ **Supabase Storage Integration Complete!**

Your Radio Cafe app now stores MP3 files in **Supabase Storage** instead of local filesystem - perfect for production deployment!

---

## 🔧 **Manual Setup Required (Do These Steps First)**

### 1. **Create Storage Bucket**
1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New Bucket"**
3. **Bucket name**: `mp3-files`
4. **Public bucket**: ✅ **YES** (check this!)
5. Click **"Save"**

### 2. **Set Storage Policies**
In **Supabase SQL Editor**, run this SQL:

```sql
-- Enable public access for reading MP3 files
CREATE POLICY "Public MP3 files are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'mp3-files');

-- Allow service role to upload/update MP3 files
CREATE POLICY "Service role can upload MP3 files" 
ON storage.objects FOR INSERT 
TO service_role
WITH CHECK (bucket_id = 'mp3-files');

-- Allow service role to update MP3 files
CREATE POLICY "Service role can update MP3 files" 
ON storage.objects FOR UPDATE 
TO service_role
USING (bucket_id = 'mp3-files');

-- Allow service role to delete MP3 files
CREATE POLICY "Service role can delete MP3 files" 
ON storage.objects FOR DELETE 
TO service_role
USING (bucket_id = 'mp3-files');
```

### 3. **Update Database Schema**
Run this SQL to update your tracks table:

```sql
-- Add storage file name field for cleanup
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS storage_file_name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN tracks.mp3_file_path IS 'Supabase Storage public URL';
COMMENT ON COLUMN tracks.storage_file_name IS 'File name in storage for cleanup';
```

### 4. **Environment Variables**
Ensure your deployment has these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ⚠️ CRITICAL FOR FILE UPLOADS
```

**🚨 IMPORTANT**: The `SUPABASE_SERVICE_ROLE_KEY` is required for server-side file operations!

---

## 🎯 **How It Works Now**

### **File Storage Flow:**
1. **Admin adds YouTube URL** → API downloads to temporary directory
2. **yt-dlp converts** → Creates MP3 in temp location  
3. **Upload to Supabase Storage** → File stored in `mp3-files` bucket
4. **Database updated** → Stores public URL and file name
5. **Cleanup** → Temporary file deleted

### **File URLs:**
- **Before**: `/downloads/song.mp3` (local file)  
- **Now**: `https://your-project.supabase.co/storage/v1/object/public/mp3-files/Artist_Song_id_timestamp.mp3`

### **File Management:**
- ✅ **Automatic cleanup** when tracks are deleted
- ✅ **Unique filenames** prevent conflicts
- ✅ **Public access** for playback
- ✅ **Scalable storage** for production

---

## 📁 **Files Modified**

### **New/Updated Files:**
- `src/lib/supabase-server.ts` - Service role client for file operations
- `src/app/api/convert-mp3/route.ts` - Upload to Supabase Storage
- `src/app/api/cleanup-storage/route.ts` - Delete files from storage
- `src/lib/music-service.ts` - File cleanup when deleting tracks
- `supabase/fresh-schema.sql` - Added `storage_file_name` field
- `src/lib/types.ts` - Updated Track interface

---

## 🌍 **Production Benefits**

### **Scalability:**
- ✅ **No local storage limits** - Supabase handles scaling
- ✅ **CDN distribution** - Fast file delivery worldwide
- ✅ **Automatic backups** - Supabase manages data safety

### **Performance:**
- ✅ **Direct file serving** - No server proxy needed
- ✅ **Optimized delivery** - Supabase CDN optimization
- ✅ **Reduced server load** - Files served directly from storage

### **Maintenance:**
- ✅ **Automatic cleanup** - Files deleted when tracks removed
- ✅ **Error handling** - Proper storage error management  
- ✅ **Cost effective** - Pay per usage model

---

## 🚀 **Deploy Steps**

1. **Complete manual setup above** ☝️
2. **Deploy your app** (Vercel, Netlify, etc.)
3. **Set environment variables** in deployment platform
4. **Test the flow**: Admin add → Convert → Cafe play
5. **Monitor**: Check Supabase Storage dashboard

**Your app now has production-ready file storage! 🎉**

---

## 🔍 **Testing Checklist**

- [ ] Storage bucket `mp3-files` created and public
- [ ] Storage policies applied correctly  
- [ ] Environment variables set (including service role key)
- [ ] Database schema updated with new fields
- [ ] Admin can add YouTube URLs
- [ ] Conversion status shows in real-time
- [ ] MP3 files appear in Supabase Storage
- [ ] Cafe can play converted files
- [ ] File cleanup works when deleting tracks

**Perfect for production deployment! 🌟**