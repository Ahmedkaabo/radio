import { TrackStorage } from './storage'
import { SupabaseService } from './supabase-service'
import type { Track } from './supabase'

// Hybrid storage service that works with both Supabase and localStorage
export class HybridStorage {
  private static useSupabase = false

    // Initialize and check if Supabase is available
  static async init(): Promise<void> {
    // Force localStorage mode in development (localhost)
    const isDevelopment = typeof window !== 'undefined' && 
                         (window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1')

    if (isDevelopment) {
      this.useSupabase = false
      console.log('🏠 Using localStorage mode - Development environment detected')
      return
    }

    try {
      // Try to fetch tracks from Supabase to test connection
      await SupabaseService.getTracks()
      this.useSupabase = true
      console.log('✅ Supabase connection established - Production mode')
    } catch {
      this.useSupabase = false
      console.log('📦 Using localStorage mode - Supabase not available')
    }
  }

  // Authentication
  static async authenticateUser(passcode: string): Promise<{ role: 'admin' | 'cafe' } | null> {
    if (this.useSupabase) {
      const user = await SupabaseService.authenticateUser(passcode)
      return user ? { role: user.role } : null
    } else {
      // Fallback to hardcoded passcodes
      if (passcode === '1234') return { role: 'admin' }
      if (passcode === '5678') return { role: 'cafe' }
      return null
    }
  }

  // Track operations
  static async getTracks(): Promise<Track[]> {
    if (this.useSupabase) {
      return await SupabaseService.getTracks()
    } else {
      const localTracks = TrackStorage.getTracks()
      // Convert localStorage format to Supabase format
      return localTracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        youtube_url: track.youtubeUrl,
        youtube_video_id: SupabaseService.extractVideoId(track.youtubeUrl),
        thumbnail_url: track.thumbnail || SupabaseService.generateThumbnail(track.youtubeUrl),
        duration: null,
        audio_file_url: track.audioFileUrl || null,
        audio_file_path: track.audioFilePath || null,
        download_status: track.downloadStatus || 'pending',
        file_size: track.fileSize || null,
        audio_format: track.audioFormat || null,
        created_at: track.addedAt,
        updated_at: track.addedAt
      }))
    }
  }

  static async addTrack(track: {
    title: string
    artist: string
    youtube_url: string
  }): Promise<Track | null> {
    if (this.useSupabase) {
      const videoId = SupabaseService.extractVideoId(track.youtube_url)
      const thumbnail = SupabaseService.generateThumbnail(track.youtube_url)
      
      return await SupabaseService.addTrack({
        ...track,
        youtube_video_id: videoId || undefined,
        thumbnail_url: thumbnail
      })
    } else {
      const localTrack = {
        title: track.title,
        artist: track.artist,
        youtubeUrl: track.youtube_url,
        thumbnail: SupabaseService.generateThumbnail(track.youtube_url)
      }
      
      TrackStorage.addTrack(localTrack)
      
      return {
        id: Date.now().toString(),
        title: track.title,
        artist: track.artist,
        youtube_url: track.youtube_url,
        youtube_video_id: SupabaseService.extractVideoId(track.youtube_url),
        thumbnail_url: localTrack.thumbnail,
        duration: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
  }

  static async updateTrack(id: string, updates: {
    title?: string
    artist?: string
    youtube_url?: string
  }): Promise<Track | null> {
    if (this.useSupabase) {
      const supabaseUpdates: Record<string, string | undefined> = { ...updates }
      if (updates.youtube_url) {
        const videoId = SupabaseService.extractVideoId(updates.youtube_url)
        supabaseUpdates.youtube_video_id = videoId || undefined
        supabaseUpdates.thumbnail_url = SupabaseService.generateThumbnail(updates.youtube_url)
      }
      
      return await SupabaseService.updateTrack(id, supabaseUpdates)
    } else {
      const localUpdates: Record<string, string | undefined> = { ...updates }
      if (updates.youtube_url) {
        localUpdates.youtubeUrl = updates.youtube_url
        localUpdates.thumbnail = SupabaseService.generateThumbnail(updates.youtube_url)
        delete localUpdates.youtube_url
      }
      
      const success = TrackStorage.updateTrack(id, localUpdates)
      if (success) {
        const tracks = await this.getTracks()
        return tracks.find(track => track.id === id) || null
      }
      return null
    }
  }

  static async deleteTrack(id: string): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseService.deleteTrack(id)
    } else {
      return TrackStorage.deleteTrack(id)
    }
  }

  // Download status management (only works in Supabase/production mode)
  static async updateDownloadStatus(id: string, status: 'pending' | 'downloading' | 'completed' | 'failed', fileInfo?: {
    audioFileUrl?: string
    audioFilePath?: string
    fileSize?: number
    audioFormat?: string
  }): Promise<boolean> {
    if (this.useSupabase) {
      const updates: Record<string, string | number | undefined> = { download_status: status }
      if (fileInfo) {
        if (fileInfo.audioFileUrl) updates.audio_file_url = fileInfo.audioFileUrl
        if (fileInfo.audioFilePath) updates.audio_file_path = fileInfo.audioFilePath
        if (fileInfo.fileSize) updates.file_size = fileInfo.fileSize
        if (fileInfo.audioFormat) updates.audio_format = fileInfo.audioFormat
      }
      const result = await SupabaseService.updateTrack(id, updates)
      return result !== null
    } else {
      // In localStorage mode, downloads are disabled
      console.log('📦 Download functionality disabled in localStorage mode')
      return true
    }
  }

  // Get download status for a track (only available in Supabase mode)
  static async getTrackDownloadStatus(id: string): Promise<{
    status: 'pending' | 'downloading' | 'completed' | 'failed'
    audioFileUrl?: string
    audioFilePath?: string
    fileSize?: number
    audioFormat?: string
  } | null> {
    if (!this.useSupabase) {
      // In localStorage mode, no downloads available
      return { status: 'pending' }
    }

    const tracks = await this.getTracks()
    const track = tracks.find(t => t.id === id)
    if (!track) return null
    
    return {
      status: track.download_status || 'pending',
      audioFileUrl: track.audio_file_url || undefined,
      audioFilePath: track.audio_file_path || undefined,
      fileSize: track.file_size || undefined,
      audioFormat: track.audio_format || undefined
    }
  }

  // Check if download functionality is enabled (only in Supabase mode)
  static isDownloadEnabled(): boolean {
    return this.useSupabase
  }

  // Utility functions
  static extractVideoId = SupabaseService.extractVideoId
  static generateThumbnail = SupabaseService.generateThumbnail
  static formatDuration = SupabaseService.formatDuration
}