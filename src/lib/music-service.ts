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
  static async addTrack(track: { title: string; artist: string; youtube_url: string }): Promise<Track | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tracks')
        .insert([track])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch {
      // Fallback to localStorage
      const newTrack: Track = {
        id: Date.now().toString(),
        ...track,
        youtube_video_id: this.extractVideoId(track.youtube_url),
        thumbnail_url: this.generateThumbnail(track.youtube_url),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const tracks = await this.getAllTracks()
      tracks.unshift(newTrack)
      localStorage.setItem('radio_cafe_tracks', JSON.stringify(tracks))
      return newTrack
    }
  }

  // Update track (admin only)
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
  static async deleteTrack(id: string): Promise<boolean> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id)
      
      return !error
    } catch {
      // Fallback to localStorage
      const tracks = await this.getAllTracks()
      const filtered = tracks.filter(t => t.id !== id)
      localStorage.setItem('radio_cafe_tracks', JSON.stringify(filtered))
      return filtered.length !== tracks.length
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