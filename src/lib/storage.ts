// Mock data storage using localStorage
export type LocalTrack = {
  id: string
  title: string
  artist: string
  youtubeUrl: string
  thumbnail?: string
  duration?: string
  addedAt: string
  // Simplified fields for MP3 conversion
  mp3FileUrl?: string
  fileSize?: number
  status?: 'pending' | 'processing' | 'ready' | 'failed'
}

const STORAGE_KEY = 'radio_cafe_tracks'

// No default tracks - admin will add YouTube songs that both admin and cafe users will see
const defaultTracks: LocalTrack[] = []

export class TrackStorage {
  static getTracks(): LocalTrack[] {
    if (typeof window === 'undefined') return defaultTracks
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading tracks:', error)
    }
    
    // Initialize with default tracks
    this.setTracks(defaultTracks)
    return defaultTracks
  }

  static setTracks(tracks: LocalTrack[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
    } catch (error) {
      console.error('Error saving tracks:', error)
    }
  }

  static addTrack(track: Omit<LocalTrack, 'id' | 'addedAt'>): LocalTrack {
    const newTrack: LocalTrack = {
      ...track,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    }
    
    const tracks = this.getTracks()
    tracks.unshift(newTrack) // Add to beginning
    this.setTracks(tracks)
    
    return newTrack
  }

  static updateTrack(id: string, updates: Partial<LocalTrack>): boolean {
    const tracks = this.getTracks()
    const index = tracks.findIndex(track => track.id === id)
    
    if (index === -1) return false
    
    tracks[index] = { ...tracks[index], ...updates }
    this.setTracks(tracks)
    
    return true
  }

  static deleteTrack(id: string): boolean {
    const tracks = this.getTracks()
    const filtered = tracks.filter(track => track.id !== id)
    
    if (filtered.length === tracks.length) return false
    
    this.setTracks(filtered)
    return true
  }

  static getTrack(id: string): LocalTrack | null {
    const tracks = this.getTracks()
    return tracks.find(track => track.id === id) || null
  }

  static extractVideoId(url: string): string | null {
    // Extract YouTube video ID from various URL formats
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
}