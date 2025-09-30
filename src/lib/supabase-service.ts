import { createClient } from './supabase'
import type { Track, AdminUser } from './supabase'

export class SupabaseService {
  private static client = createClient()

  // Authentication
  static async authenticateUser(passcode: string): Promise<AdminUser | null> {
    if (!this.client) return null

    try {
      const { data, error } = await this.client
        .from('admin_users')
        .select('*')
        .eq('passcode', passcode)
        .single()

      if (error) {
        console.error('Authentication error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Authentication error:', error)
      return null
    }
  }

  // Track operations
  static async getTracks(): Promise<Track[]> {
    if (!this.client) return []

    try {
      const { data, error } = await this.client
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching tracks:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching tracks:', error)
      return []
    }
  }

  static async addTrack(track: {
    title: string
    artist: string
    youtube_url: string
    youtube_video_id?: string
    thumbnail_url?: string
    duration?: number
  }): Promise<Track | null> {
    if (!this.client) return null

    try {
      const { data, error } = await this.client
        .from('tracks')
        .insert([track])
        .select()
        .single()

      if (error) {
        console.error('Error adding track:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error adding track:', error)
      return null
    }
  }

  static async updateTrack(id: string, updates: {
    title?: string
    artist?: string
    youtube_url?: string
    youtube_video_id?: string
    thumbnail_url?: string
    duration?: number
  }): Promise<Track | null> {
    if (!this.client) return null

    try {
      const { data, error } = await this.client
        .from('tracks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating track:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating track:', error)
      return null
    }
  }

  static async deleteTrack(id: string): Promise<boolean> {
    if (!this.client) return false

    try {
      const { error } = await this.client
        .from('tracks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting track:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting track:', error)
      return false
    }
  }

  // Utility functions
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  static generateThumbnail(youtubeUrl: string): string {
    const videoId = this.extractVideoId(youtubeUrl)
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    return 'https://via.placeholder.com/300x300/6366f1/white?text=Music'
  }

  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
}