// Audio service for handling different audio sources
export class AudioService {
  // Extract YouTube video ID from URL
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

  // Generate thumbnail URL from YouTube video
  static generateThumbnail(youtubeUrl: string): string {
    const videoId = this.extractVideoId(youtubeUrl)
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    return 'https://via.placeholder.com/300x300/64748b/white?text=♪'
  }

  // Get embeddable YouTube URL (for iframe)
  static getEmbedUrl(youtubeUrl: string): string | null {
    const videoId = this.extractVideoId(youtubeUrl)
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=0`
    }
    return null
  }

  // Check if URL is a YouTube URL
  static isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com|youtu\.be)/.test(url)
  }

  // Convert YouTube URL to different formats
  static getYouTubeFormats(youtubeUrl: string) {
    const videoId = this.extractVideoId(youtubeUrl)
    if (!videoId) return null

    return {
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      // Note: Direct audio extraction requires server-side processing
      // For demo purposes, we'll use the embed player
    }
  }

  // Format time in MM:SS
  static formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
}