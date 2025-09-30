// Fresh, minimal types for Radio Cafe
export interface Track {
  id: string
  title: string
  artist: string
  youtube_url: string
  youtube_video_id?: string
  thumbnail_url?: string
  mp3_file_path?: string
  conversion_status: 'pending' | 'processing' | 'completed' | 'error'
  file_size?: number
  duration?: number
  error_message?: string
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: string
  role: 'admin' | 'cafe'
  passcode: string
  created_at: string
}