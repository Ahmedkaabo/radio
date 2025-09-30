import { createClient } from './supabase-client'
import type { Track, AdminUser } from './types'

export class MusicService {
  
  // Authentication
  static async authenticate(passcode: string): Promise<AdminUser | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('passcode', passcode)
        .single()
      
      if (error || !data) return null
      return data
    } catch {
      // Fallback for localStorage mode
      if (passcode === '1234') return { id: '1', role: 'admin', passcode: '1234', created_at: new Date().toISOString() }
      if (passcode === '5678') return { id: '2', role: 'cafe', passcode: '5678', created_at: new Date().toISOString() }
      return null
    }
  }

  // Get all tracks (for both admin and cafe)
  static async getAllTracks(): Promise<Track[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch {
      // Fallback to localStorage
      const stored = localStorage.getItem('radio_cafe_tracks')
      return stored ? JSON.parse(stored) : []
    }
  }

  // Add track (admin only)
  static async addTrack(trackData: { title: string; artist: string; youtube_url: string }): Promise<Track> {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('tracks')
        .insert([{
          ...trackData,
          conversion_status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        // Fallback to localStorage
        const newTrack: Track = {
          id: Math.random().toString(36).substr(2, 9),
          ...trackData,
          conversion_status: 'pending' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const existingTracks = JSON.parse(localStorage.getItem('radio_cafe_tracks') || '[]')
        const updatedTracks = [newTrack, ...existingTracks]
        localStorage.setItem('radio_cafe_tracks', JSON.stringify(updatedTracks))
        
        // Trigger MP3 conversion in background
        this.convertToMp3(newTrack.id)
        
        return newTrack
      }

      // Trigger MP3 conversion in background
      this.convertToMp3(data.id)

      return data
    } catch (error) {
      console.error('Error adding track:', error)
      throw error
    }
  }

  static async convertToMp3(trackId: string): Promise<void> {
    try {
      const response = await fetch('/api/convert-mp3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId }),
      })

      if (!response.ok) {
        console.error('Conversion failed:', await response.text())
      }
    } catch (error) {
      console.error('Error triggering conversion:', error)
    }
  }

  static async getConversionStatus(trackId: string): Promise<Track | null> {
    try {
      const response = await fetch(`/api/conversion-status?trackId=${trackId}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
    return null
  }  // Update track (admin only)
  static async updateTrack(id: string, updates: { title?: string; artist?: string; youtube_url?: string }): Promise<boolean> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tracks')
        .update(updates)
        .eq('id', id)
      
      return !error
    } catch {
      // Fallback to localStorage
      const tracks = await this.getAllTracks()
      const index = tracks.findIndex(t => t.id === id)
      if (index === -1) return false
      
      tracks[index] = { ...tracks[index], ...updates, updated_at: new Date().toISOString() }
      localStorage.setItem('radio_cafe_tracks', JSON.stringify(tracks))
      return true
    }
  }

  // Delete track (admin only)
  static async deleteTrack(id: string): Promise<void> {
    try {
      const supabase = createClient()
      
      // Get track info before deleting (to clean up storage file)
      const { data: track } = await supabase
        .from('tracks')
        .select('storage_file_name')
        .eq('id', id)
        .single()

      // Delete from database
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase error:', error)
        // Fallback to localStorage
        const existingTracks = JSON.parse(localStorage.getItem('radio_cafe_tracks') || '[]')
        const updatedTracks = existingTracks.filter((track: Track) => track.id !== id)
        localStorage.setItem('radio_cafe_tracks', JSON.stringify(updatedTracks))
      } else {
        // Clean up storage file if it exists
        if (track?.storage_file_name) {
          this.cleanupStorageFile(track.storage_file_name)
        }
      }
    } catch (error) {
      console.error('Error deleting track:', error)
      throw error
    }
  }

  private static async cleanupStorageFile(fileName: string): Promise<void> {
    try {
      // Call cleanup API
      await fetch('/api/cleanup-storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      })
    } catch (error) {
      console.warn('Failed to cleanup storage file:', error)
    }
  }

  // Helper methods
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  static generateThumbnail(url: string): string {
    const videoId = this.extractVideoId(url)
    return videoId 
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : 'https://via.placeholder.com/480x360/6366f1/white?text=Music'
  }
}