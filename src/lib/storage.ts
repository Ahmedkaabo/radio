// Mock data storage using localStorage
export type Track = {
  id: string
  title: string
  artist: string
  youtubeUrl: string
  audioUrl?: string
  thumbnail?: string
  duration?: string
  addedAt: string
  // Download-related fields
  audioFileUrl?: string
  audioFilePath?: string
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed'
  fileSize?: number
  audioFormat?: string
}

const STORAGE_KEY = 'radio_cafe_tracks'

// Default tracks for demo
const defaultTracks: Track[] = [
  {
    id: '1',
    title: 'Smooth Jazz Cafe',
    artist: 'Demo Artist',
    youtubeUrl: 'https://youtube.com/watch?v=demo1',
    thumbnail: 'https://via.placeholder.com/300x300/6366f1/white?text=Jazz',
    duration: '3:24',
    addedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Ambient Lounge',
    artist: 'Chill Collective',
    youtubeUrl: 'https://youtube.com/watch?v=demo2',
    thumbnail: 'https://via.placeholder.com/300x300/8b5cf6/white?text=Ambient',
    duration: '4:12',
    addedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Bossa Nova Dreams',
    artist: 'Latin Vibes',
    youtubeUrl: 'https://youtube.com/watch?v=demo3',
    thumbnail: 'https://via.placeholder.com/300x300/a855f7/white?text=Bossa',
    duration: '2:58',
    addedAt: new Date().toISOString()
  }
]

export class TrackStorage {
  static getTracks(): Track[] {
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

  static setTracks(tracks: Track[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
    } catch (error) {
      console.error('Error saving tracks:', error)
    }
  }

  static addTrack(track: Omit<Track, 'id' | 'addedAt'>): Track {
    const newTrack: Track = {
      ...track,
      id: Date.now().toString(),
      addedAt: new Date().toISOString()
    }
    
    const tracks = this.getTracks()
    tracks.unshift(newTrack) // Add to beginning
    this.setTracks(tracks)
    
    return newTrack
  }

  static updateTrack(id: string, updates: Partial<Track>): boolean {
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

  static getTrack(id: string): Track | null {
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