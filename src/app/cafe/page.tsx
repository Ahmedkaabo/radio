'use client'

import { useEffect, useState } from 'react'
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
  }, [router])

  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      setCurrentTrack(tracks[0])
    }
  }, [tracks, currentTrack])

  const playTrack = (track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const nextTrack = () => {
    if (tracks.length === 0) return
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    const nextIndex = (currentIndex + 1) % tracks.length
    setCurrentTrack(tracks[nextIndex])
  }

  const previousTrack = () => {
    if (tracks.length === 0) return
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1
    setCurrentTrack(tracks[prevIndex])
  }

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
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
                  
                  {currentTrack.youtube_video_id && (
                    <div className="mb-6">
                      <iframe
                        width="100%"
                        height="315"
                        src={`https://www.youtube.com/embed/${currentTrack.youtube_video_id}?autoplay=${isPlaying ? 1 : 0}&controls=0`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <Button onClick={previousTrack} size="sm" variant="outline">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button onClick={togglePlay} size="lg">
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                    <Button onClick={nextTrack} size="sm" variant="outline">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <Slider
                      value={volume}
                      onValueChange={setVolume}
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
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      currentTrack?.id === track.id
                        ? 'bg-blue-600/50 border border-blue-500'
                        : 'bg-gray-800/50 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{track.title}</div>
                    <div className="text-gray-400 text-xs">{track.artist}</div>
                  </div>
                ))}
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
