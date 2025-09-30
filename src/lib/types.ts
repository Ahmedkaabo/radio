// Fresh, minimal types for Radio Cafe
export type Track = {
  id: string
  title: string
  artist: string
  youtube_url: string
  youtube_video_id: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: string
  role: 'admin' | 'cafe'
  passcode: string
  created_at: string
}