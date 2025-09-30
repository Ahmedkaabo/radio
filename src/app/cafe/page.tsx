'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  LogOut, 
  Shuffle,
  Repeat,
  Music,
  Coffee,
  Loader2,
  Download
} from 'lucide-react'
import { RadioCafeService, type Track } from '@/lib/radio-cafe-service'
import { HybridStorage } from '@/lib/hybrid-storage'

export default function CafePlayer() {
  // Helper: get cached audio URL or fetch and cache
  const getCachedAudioUrl = useCallback(async (track: Track): Promise<string> => {
    if (!track.audio_file_url) return ''
    const cacheName = 'radio-cafe-audio-cache'
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(track.audio_file_url)
    if (cachedResponse) {
      // Return object URL from cached response
      const blob = await cachedResponse.blob()
      return URL.createObjectURL(blob)
    } else {
      // Fetch and cache
      const response = await fetch(track.audio_file_url)
      if (response.ok) {
        await cache.put(track.audio_file_url, response.clone())
        const blob = await response.blob()
        return URL.createObjectURL(blob)
      } else {
        return track.audio_file_url
      }
    }
  }, [])
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(70)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playQueue, setPlayQueue] = useState<number[]>([])
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()

  // Check authentication and initialize hybrid storage
  useEffect(() => {
    const init = async () => {
      const userRole = localStorage.getItem('userRole')
      if (userRole !== 'cafe') {
        router.push('/login')
        return
      }
      
      // Initialize hybrid storage
      await HybridStorage.init()
    }
    
    init()
  }, [router])

  // Load playable tracks
  const loadTracks = useCallback(async () => {
    setIsLoading(true)
    console.log('🎵 Loading tracks...')
    try {
      // Use HybridStorage to get tracks (falls back to localStorage if Supabase not available)
      const allTracks = await HybridStorage.getTracks()
      console.log('🎵 All tracks from HybridStorage:', allTracks.length, allTracks)
      
      // Filter for playable tracks (those with completed downloads)
      const loadedTracks = allTracks.filter(track => 
        track.download_status === 'completed' && track.audio_file_url
      )
      console.log('🎵 Filtered playable tracks:', loadedTracks.length, loadedTracks)
      setTracks(loadedTracks)
      
      if (loadedTracks.length > 0) {
        if (!currentTrack) {
          setCurrentTrack(loadedTracks[0])
          setCurrentTrackIndex(0)
          console.log('🎵 Set current track:', loadedTracks[0])
        }
        
        // Update play queue
        if (!shuffle) {
          setPlayQueue(loadedTracks.map((_, index) => index))
        }
      } else {
        console.log('🎵 No playable tracks found - playlist will be empty')
      }
    } catch (error) {
      console.error('❌ Failed to load tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentTrack, shuffle])

  useEffect(() => {
    loadTracks()
    // Refresh tracks every 30 seconds to check for new downloads
    const interval = setInterval(loadTracks, 30000)
    return () => clearInterval(interval)
  }, [loadTracks])

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    // Audio event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      // Use a function that calls the current handleNext to avoid dependency issue
      if (tracks.length === 0) return

      let nextIndex
      if (repeat && tracks.length === 1) {
        nextIndex = currentTrackIndex
      } else {
        const currentQueuePosition = playQueue.indexOf(currentTrackIndex)
        const nextQueuePosition = (currentQueuePosition + 1) % playQueue.length
        nextIndex = playQueue[nextQueuePosition]
      }

      setCurrentTrackIndex(nextIndex)
      setCurrentTrack(tracks[nextIndex])
    })

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e)
      setIsPlaying(false)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [tracks, repeat, currentTrackIndex, playQueue])

  // Update audio source when current track changes
  useEffect(() => {
    const setAudioSource = async () => {
      if (currentTrack && audioRef.current) {
        const audio = audioRef.current
        // Use cached audio if available
        const src = await getCachedAudioUrl(currentTrack)
        audio.src = src
        audio.volume = volume / 100
        if (isPlaying) {
          audio.play().catch(console.error)
        }
      }
    }
    setAudioSource()
  }, [currentTrack, volume, isPlaying, getCachedAudioUrl])

  // Generate shuffled play queue
  const shuffleQueue = useCallback(() => {
    const indices = tracks.map((_, index) => index)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [tracks])

  // Update play queue when shuffle changes
  useEffect(() => {
    if (tracks.length > 0) {
      if (shuffle) {
        setPlayQueue(shuffleQueue())
      } else {
        setPlayQueue(tracks.map((_, index) => index))
      }
    }
  }, [shuffle, shuffleQueue, tracks])

  const handlePlay = async () => {
    if (!audioRef.current || !currentTrack) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Playback error:', error)
      setIsPlaying(false)
    }
  }

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return

    let nextIndex
    if (repeat && tracks.length === 1) {
      nextIndex = currentTrackIndex
    } else {
      const currentQueuePosition = playQueue.indexOf(currentTrackIndex)
      const nextQueuePosition = (currentQueuePosition + 1) % playQueue.length
      nextIndex = playQueue[nextQueuePosition]
    }

    setCurrentTrackIndex(nextIndex)
    setCurrentTrack(tracks[nextIndex])
  }, [tracks, repeat, currentTrackIndex, playQueue])

  const handlePrevious = () => {
    if (tracks.length === 0) return

    let prevIndex
    if (repeat && tracks.length === 1) {
      prevIndex = currentTrackIndex
    } else {
      const currentQueuePosition = playQueue.indexOf(currentTrackIndex)
      const prevQueuePosition = currentQueuePosition === 0 ? playQueue.length - 1 : currentQueuePosition - 1
      prevIndex = playQueue[prevQueuePosition]
    }

    setCurrentTrackIndex(prevIndex)
    setCurrentTrack(tracks[prevIndex])
  }

  const handleTrackSelect = (track: Track, index: number) => {
    setCurrentTrack(track)
    setCurrentTrackIndex(index)
  }

  const handleSeek = (newTime: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime[0]
      setCurrentTime(newTime[0])
    }
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0]
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol / 100
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Loading your music...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Coffee className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">Radio Cafe</h1>
              <p className="text-blue-200">Your offline music experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-blue-200">
              {tracks.length} tracks available
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline" 
              size="sm"
              className="border-blue-300 text-blue-300 hover:bg-blue-800"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Now Playing */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Music className="h-5 w-5" />
                  <span>Now Playing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentTrack ? (
                  <>
                    {/* Album Art & Track Info */}
                    <div className="flex items-center space-x-6">
                      {currentTrack.thumbnail_url ? (
                        <Image 
                          src={currentTrack.thumbnail_url} 
                          alt="Album Art"
                          width={96}
                          height={96}
                          className="w-24 h-24 rounded-lg object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-white/20 flex items-center justify-center">
                          <Music className="h-8 w-8 text-white/50" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">{currentTrack.title}</h2>
                        <p className="text-blue-200">{currentTrack.artist}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-blue-300">
                          {currentTrack.duration && (
                            <span>{RadioCafeService.formatDuration(currentTrack.duration)}</span>
                          )}
                          {currentTrack.file_size && (
                            <span>{RadioCafeService.formatFileSize(currentTrack.file_size)}</span>
                          )}
                          <span className="capitalize">{currentTrack.audio_format || 'M4A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Slider
                        value={[currentTime]}
                        max={duration}
                        step={1}
                        onValueChange={handleSeek}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-blue-200">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center space-x-6">
                      <Button
                        onClick={() => setShuffle(!shuffle)}
                        variant="ghost"
                        size="sm"
                        className={`text-white hover:bg-white/20 ${shuffle ? 'bg-white/20' : ''}`}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>

                      <Button
                        onClick={handlePrevious}
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20"
                        disabled={tracks.length === 0}
                      >
                        <SkipBack className="h-6 w-6" />
                      </Button>

                      <Button
                        onClick={handlePlay}
                        size="lg"
                        className="bg-white text-purple-900 hover:bg-blue-100 w-16 h-16 rounded-full"
                        disabled={!currentTrack}
                      >
                        {isPlaying ? (
                          <Pause className="h-8 w-8" />
                        ) : (
                          <Play className="h-8 w-8 ml-1" />
                        )}
                      </Button>

                      <Button
                        onClick={handleNext}
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/20"
                        disabled={tracks.length === 0}
                      >
                        <SkipForward className="h-6 w-6" />
                      </Button>

                      <Button
                        onClick={() => setRepeat(!repeat)}
                        variant="ghost"
                        size="sm"
                        className={`text-white hover:bg-white/20 ${repeat ? 'bg-white/20' : ''}`}
                      >
                        <Repeat className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center space-x-4">
                      <Volume2 className="h-5 w-5 text-white" />
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="flex-1"
                      />
                      <span className="text-sm text-blue-200 w-10">{volume}%</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Music className="h-16 w-16 mx-auto mb-4 text-white/30" />
                    <p className="text-white/70">No tracks available</p>
                    <p className="text-blue-300 text-sm mt-2">
                      Ask the admin to add and download some music!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Playlist */}
          <div>
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Music className="h-5 w-5" />
                    <span>Playlist ({tracks.length})</span>
                  </div>
                  <Button
                    onClick={loadTracks}
                    variant="ghost"
                    size="sm"
                    className="text-blue-300 hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      onClick={() => handleTrackSelect(track, index)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        currentTrack?.id === track.id
                          ? 'bg-white/20 border-l-4 border-amber-400'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {track.thumbnail_url ? (
                          <Image 
                            src={track.thumbnail_url} 
                            alt="Thumbnail"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">
                            <Music className="h-4 w-4 text-white/50" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{track.title}</p>
                          <p className="text-blue-200 text-sm truncate">{track.artist}</p>
                        </div>
                        
                        <div className="text-blue-300 text-xs">
                          {track.duration && RadioCafeService.formatDuration(track.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {tracks.length === 0 && (
                  <div className="text-center py-8 text-white/50">
                    <Music className="h-12 w-12 mx-auto mb-4" />
                    <p>No music available offline</p>
                    <p className="text-sm mt-2">Check back later for new downloads!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}