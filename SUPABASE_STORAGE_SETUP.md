# Supabase Storage Setup for MP3 Files

## 🔧 **Manual Setup Steps (Do These First!)**

### 1. Create Storage Bucket
1. Go to your **Supabase Dashboard** → **Storage**
2. Click **"New Bucket"**
3. **Bucket name**: `mp3-files`
4. **Public bucket**: ✅ **YES** (check this box)
5. Click **"Save"**

### 2. Set Storage Policies
In your Supabase SQL Editor, run this SQL:

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

### 3. Environment Variables
Make sure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **IMPORTANT**: You need the `SUPABASE_SERVICE_ROLE_KEY` for server-side file uploads!

---

## ✅ **After Manual Setup, I'll Update the Code**

Once you've done the manual setup above, the code changes will:
1. Upload MP3 files to Supabase Storage instead of local filesystem
2. Store public URLs in the database
3. Handle file cleanup and error management
4. Provide better scalability for production

**Ready to proceed with the code changes?**