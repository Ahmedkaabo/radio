'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Edit2, LogOut, Save, X, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { MusicService } from '@/lib/music-service'
import type { Track } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')

  const loadTracks = async () => {
    try {
      const data = await MusicService.getAllTracks()
      setTracks(data)
    } catch (error) {
      console.error('Failed to load tracks:', error)
    }
  }

  // Polling for conversion status updates
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const userRole = localStorage.getItem('userRole')
    if (userRole !== 'admin') {
      router.push('/login')
      return
    }
    loadTracks()

    // Start polling for conversion updates
    pollingRef.current = setInterval(loadTracks, 5000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [router])

  const handleAddTrack = async () => {
    if (!title.trim() || !artist.trim() || !youtubeUrl.trim()) return

    setLoading(true)
    try {
      await MusicService.addTrack({
        title: title.trim(),
        artist: artist.trim(),
        youtube_url: youtubeUrl.trim()
      })
      
      setTitle('')
      setArtist('')
      setYoutubeUrl('')
      await loadTracks()
    } catch (error) {
      console.error('Failed to add track:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (track: Track) => {
    setEditingId(track.id)
    setEditTitle(track.title)
    setEditArtist(track.artist)
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editArtist.trim()) return

    setLoading(true)
    try {
      await MusicService.updateTrack(editingId, {
        title: editTitle.trim(),
        artist: editArtist.trim()
      })
      setEditingId(null)
      await loadTracks()
    } catch (error) {
      console.error('Failed to update track:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditArtist('')
  }

  const deleteTrack = async (id: string) => {
    if (!confirm('Delete this track?')) return

    setLoading(true)
    try {
      await MusicService.deleteTrack(id)
      await loadTracks()
    } catch (error) {
      console.error('Failed to delete track:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Song Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="Artist Name"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
              <Input
                placeholder="YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <Button 
                onClick={handleAddTrack} 
                disabled={loading || !title || !artist || !youtubeUrl}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Track
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Tracks ({tracks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tracks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tracks yet. Add some YouTube songs above!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Song</TableHead>
                    <TableHead>YouTube</TableHead>
                    <TableHead>MP3 Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell>
                        {editingId === track.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Title"
                            />
                            <Input
                              value={editArtist}
                              onChange={(e) => setEditArtist(e.target.value)}
                              placeholder="Artist"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{track.title}</div>
                            <div className="text-sm text-gray-500">{track.artist}</div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <a 
                          href={track.youtube_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Watch Video
                        </a>
                        {track.youtube_video_id && (
                          <div className="text-xs text-gray-400 mt-1">
                            ID: {track.youtube_video_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {track.conversion_status === 'pending' && (
                            <>
                              <Clock className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm text-yellow-600">Pending</span>
                            </>
                          )}
                          {track.conversion_status === 'processing' && (
                            <>
                              <Download className="h-4 w-4 text-blue-500 animate-pulse" />
                              <span className="text-sm text-blue-600">Converting...</span>
                            </>
                          )}
                          {track.conversion_status === 'completed' && (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div className="text-sm">
                                <div className="text-green-600">Ready</div>
                                {track.file_size && (
                                  <div className="text-xs text-gray-400">
                                    {Math.round(track.file_size / 1024 / 1024 * 100) / 100} MB
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          {track.conversion_status === 'error' && (
                            <>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <div className="text-sm">
                                <div className="text-red-600">Error</div>
                                {track.error_message && (
                                  <div className="text-xs text-gray-400 max-w-32 truncate" title={track.error_message}>
                                    {track.error_message}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(track.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {editingId === track.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={saveEdit}
                                disabled={loading}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(track)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteTrack(track.id)}
                                disabled={loading}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
