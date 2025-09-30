import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export type Track = {
  id: string
  title: string
  artist: string
  youtube_url: string
  youtube_video_id?: string | null
  thumbnail_url?: string | null
  duration?: number | null
  audio_file_url?: string | null
  audio_file_path?: string | null
  download_status: 'pending' | 'downloading' | 'completed' | 'failed'
  file_size?: number | null
  audio_format?: string | null
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: string
  role: 'admin' | 'cafe'
  passcode: string
  created_at: string
}