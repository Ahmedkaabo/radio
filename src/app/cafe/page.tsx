'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, SkipForward, SkipBack, Volume2, LogOut } from 'lucide-react'
import { MusicService } from '@/lib/music-service'
import type { Track } from '@/lib/types'

export default function CafePage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState([70])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const loadTracks = async () => {
    try {
      const data = await MusicService.getAllTracks()
      setTracks(data)
    } catch (error) {
      console.error('Error loading tracks:', error)
    }
  }

  useEffect(() => {
    const userRole = localStorage.getItem('userRole')
    if (userRole !== 'cafe') {
      router.push('/login')
      return
    }
    loadTracks()

    // Poll for updates every 10 seconds
    const interval = setInterval(loadTracks, 10000)
    return () => clearInterval(interval)
  }, [router])

  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      // Find first completed track or just use first track
      const completedTrack = tracks.find(t => t.conversion_status === 'completed')
      setCurrentTrack(completedTrack || tracks[0])
    }
  }, [tracks, currentTrack])

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    let nextIndex = (currentIndex + 1) % tracks.length
    
    // Try to find next completed track
    let attempts = 0
    while (attempts < tracks.length && tracks[nextIndex]?.conversion_status !== 'completed') {
      nextIndex = (nextIndex + 1) % tracks.length
      attempts++
    }
    
    if (tracks[nextIndex]?.conversion_status === 'completed') {
      setCurrentTrack(tracks[nextIndex])
    }
  }, [tracks, currentTrack])

  const previousTrack = useCallback(() => {
    if (tracks.length === 0) return
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    let prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1
    
    // Try to find previous completed track
    let attempts = 0
    while (attempts < tracks.length && tracks[prevIndex]?.conversion_status !== 'completed') {
      prevIndex = prevIndex === 0 ? tracks.length - 1 : prevIndex - 1
      attempts++
    }
    
    if (tracks[prevIndex]?.conversion_status === 'completed') {
      setCurrentTrack(tracks[prevIndex])
    }
  }, [tracks, currentTrack])

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0)
    const handleDurationChange = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      setIsPlaying(false)
      nextTrack()
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    // Set initial volume
    audio.volume = volume[0] / 100

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [volume, nextTrack])

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (audio && currentTrack?.mp3_file_path) {
      audio.src = currentTrack.mp3_file_path
      audio.load()
      if (isPlaying) {
        audio.play().catch(console.error)
      }
    }
  }, [currentTrack, isPlaying])

  const playTrack = (track: Track) => {
    if (track.conversion_status !== 'completed' || !track.mp3_file_path) {
      alert('Track is not ready yet. Please wait for conversion to complete.')
      return
    }
    setCurrentTrack(track)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.mp3_file_path) return
    
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(console.error)
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

  const getTrackStatus = (track: Track) => {
    switch (track.conversion_status) {
      case 'completed': return { icon: '✅', text: 'Ready', color: 'text-green-400' }
      case 'processing': return { icon: '⏳', text: 'Converting...', color: 'text-blue-400' }
      case 'error': return { icon: '❌', text: 'Error', color: 'text-red-400' }
      default: return { icon: '⏰', text: 'Waiting...', color: 'text-yellow-400' }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎵 Radio Cafe</h1>
            <p className="text-blue-200">Your music streaming experience</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Playing */}
          <Card className="lg:col-span-2 bg-black/30 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Now Playing</CardTitle>
            </CardHeader>
            <CardContent>
              {currentTrack ? (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{currentTrack.title}</h3>
                  <p className="text-gray-300 mb-6">{currentTrack.artist}</p>
                  
                  {/* Hidden Audio Element */}
                  <audio ref={audioRef} className="hidden" />
                  
                  {/* Player Display */}
                  <div className="mb-6">
                    {currentTrack.mp3_file_path ? (
                      <>
                        {/* Album Art Placeholder */}
                        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg aspect-video flex items-center justify-center mb-4 relative overflow-hidden">
                          <div className="text-8xl opacity-50">🎵</div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-white text-lg font-medium">{currentTrack.title}</div>
                              <div className="text-gray-200 text-sm">{currentTrack.artist}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={1}
                            className="w-full"
                            onValueChange={(value) => {
                              if (audioRef.current && !isNaN(value[0])) {
                                audioRef.current.currentTime = value[0]
                                setCurrentTime(value[0])
                              }
                            }}
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-800/50 rounded-lg aspect-video flex items-center justify-center mb-4">
                        <div className="text-center">
                          <div className={`text-4xl mb-2 ${getTrackStatus(currentTrack).color}`}>
                            {getTrackStatus(currentTrack).icon}
                          </div>
                          <p className={getTrackStatus(currentTrack).color}>
                            {getTrackStatus(currentTrack).text}
                          </p>
                          {currentTrack.error_message && (
                            <p className="text-red-300 text-sm mt-2 max-w-md">{currentTrack.error_message}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Player Controls */}
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <Button onClick={previousTrack} size="sm" variant="outline">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={togglePlay} 
                      size="lg"
                      disabled={!currentTrack?.mp3_file_path}
                    >
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                    <Button onClick={nextTrack} size="sm" variant="outline">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <Slider
                      value={volume}
                      onValueChange={(value) => {
                        setVolume(value)
                        if (audioRef.current) {
                          audioRef.current.volume = value[0] / 100
                        }
                      }}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm w-8">{volume[0]}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No tracks available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Playlist */}
          <Card className="bg-black/30 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Playlist ({tracks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tracks.map((track) => {
                  const status = getTrackStatus(track)
                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(track)}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        currentTrack?.id === track.id
                          ? 'bg-blue-600/50 border border-blue-500'
                          : track.conversion_status === 'completed'
                          ? 'bg-gray-800/50 hover:bg-gray-700/50'
                          : 'bg-gray-800/30 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm">{track.title}</div>
                          <div className="text-gray-400 text-xs">{track.artist}</div>
                        </div>
                        <div className={`text-xs ${status.color} ml-2`}>
                          {status.icon}
                        </div>
                      </div>
                      {track.file_size && track.conversion_status === 'completed' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(track.file_size / 1024 / 1024 * 100) / 100} MB
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {tracks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No tracks in playlist</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
