import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Browser client for client-side operations
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase') || supabaseAnonKey.includes('your_supabase')) {
    throw new Error('Supabase not configured')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// TypeScript types matching our simplified schema
export type Track = {
  id: string
  title: string
  artist: string
  youtube_url: string
  youtube_video_id?: string | null
  thumbnail_url?: string | null
  duration?: number | null
  mp3_file_url?: string | null
  file_size?: number | null
  status: 'pending' | 'processing' | 'ready' | 'failed'
  error_message?: string | null
  created_at: string
  updated_at: string
}

export type AdminUser = {
  id: string
  role: 'admin' | 'cafe'
  passcode: string
  created_at: string
}

export type TrackStats = {
  total_tracks: number
  completed_downloads: number
  active_downloads: number
  failed_downloads: number
  pending_downloads: number
  total_storage_bytes: number
  total_storage_mb: number
}

// Service class for common operations
export class RadioCafeService {
  
  // Authentication
  static async authenticateUser(passcode: string): Promise<AdminUser | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('passcode', passcode)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data
  }

  // Track management
  static async getAllTracks(): Promise<Track[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching tracks:', error)
      return []
    }
    
    return data || []
  }

  static async getReadyTracks(): Promise<Track[]> {
    const supabase = createClient()
    
    console.log('🔍 Querying ready tracks...')
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('status', 'ready')
      .not('mp3_file_url', 'is', null)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching ready tracks:', error)
      return []
    }
    
    console.log('✅ Found ready tracks:', data?.length || 0, data)
    return data || []
  }

  static async addTrack(track: {
    title: string
    artist: string
    youtube_url: string
  }): Promise<Track | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tracks')
      .insert([track])
      .select()
      .single()
    
    if (error) {
      console.error('Error adding track:', error)
      return null
    }
    
    return data
  }

  static async updateTrack(
    trackId: string, 
    updates: Partial<Omit<Track, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('tracks')
      .update(updates)
      .eq('id', trackId)
    
    if (error) {
      console.error('Error updating track:', error)
      return false
    }
    
    return true
  }

  static async deleteTrack(trackId: string): Promise<boolean> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId)
    
    if (error) {
      console.error('Error deleting track:', error)
      return false
    }
    
    return true
  }

  static async getTrackById(trackId: string): Promise<Track | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()
    
    if (error) {
      console.error('Error fetching track:', error)
      return null
    }
    
    return data
  }

  // Statistics
  static async getTrackStats(): Promise<TrackStats | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('track_stats')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error fetching track stats:', error)
      return null
    }
    
    return data
  }

  // Utility functions
  static extractVideoId(youtubeUrl: string): string | null {
    try {
      const url = new URL(youtubeUrl)
      
      // Handle youtube.com/watch?v=VIDEO_ID
      if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
        return url.searchParams.get('v')
      }
      
      // Handle youtu.be/VIDEO_ID
      if (url.hostname === 'youtu.be') {
        return url.pathname.slice(1).split('?')[0]
      }
      
      return null
    } catch {
      return null
    }
  }

  static generateThumbnailUrl(youtubeUrl: string): string | null {
    const videoId = this.extractVideoId(youtubeUrl)
    if (!videoId) return null
    
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Download management
  static async triggerDownload(trackId: string): Promise<{success: boolean, error?: string}> {
    try {
      const track = await this.getTrackById(trackId)
      if (!track) {
        return { success: false, error: 'Track not found' }
      }

      if (track.download_status !== 'pending') {
        return { success: false, error: 'Track is not in pending status' }
      }

      const response = await fetch('/api/download-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId: track.id,
          youtubeUrl: track.youtube_url
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || 'Download failed' }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  static async checkDownloadStatus(trackId: string): Promise<Track | null> {
    try {
      const response = await fetch(`/api/download-audio?trackId=${trackId}`)
      
      if (!response.ok) {
        return null
      }
      
      // Refresh the track data from database
      return await this.getTrackById(trackId)
    } catch (error) {
      console.error('Error checking download status:', error)
      return null
    }
  }
}