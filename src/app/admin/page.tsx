'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Music, 
  Plus, 
  Trash2, 
  Edit2, 
  LogOut, 
  Shield, 
  Youtube,
  Save,
  X,
  Loader2
} from 'lucide-react'
import { RadioCafeService, type Track } from '@/lib/radio-cafe-service'

export default function AdminDashboard() {
  const router = useRouter()
  
  // State declarations
  const [tracks, setTracks] = useState<Track[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingTrack, setEditingTrack] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [stats, setStats] = useState({
    total: 0
  })

  // Load tracks function
  const loadTracks = useCallback(async () => {
    try {
      const loadedTracks = await RadioCafeService.getAllTracks()
      setTracks(loadedTracks)
      setStats({ total: loadedTracks.length })
    } catch (error) {
      console.error('Failed to load tracks:', error)
    }
  }, [])

  // Authentication and data loading effect
  useEffect(() => {
    // Check authentication
    const userRole = localStorage.getItem('userRole')
    if (userRole !== 'admin') {
      router.push('/login')
      return
    }

    loadTracks()
    // Refresh tracks every 30 seconds
    const interval = setInterval(loadTracks, 30000)
    return () => clearInterval(interval)
  }, [router, loadTracks])

  // Handle track editing
  const handleEditTrack = async (trackId: string) => {
    if (!editTitle.trim() || !editArtist.trim()) return

    try {
      await RadioCafeService.updateTrack(trackId, {
        title: editTitle.trim(),
        artist: editArtist.trim()
      })

      setEditingTrack(null)
      setEditTitle('')
      setEditArtist('')
      await loadTracks()
    } catch (error) {
      console.error('Error updating track:', error)
      alert('Failed to update track. Please try again.')
    }
  }

  // Start editing a track
  const startEdit = (track: Track) => {
    setEditingTrack(track.id)
    setEditTitle(track.title)
    setEditArtist(track.artist)
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingTrack(null)
    setEditTitle('')
    setEditArtist('')
  }

  // Handle track deletion
  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return

    try {
      await RadioCafeService.deleteTrack(trackId)
      await loadTracks()
    } catch (error) {
      console.error('Error deleting track:', error)
      alert('Failed to delete track. Please try again.')
    }
  }

  // Handle adding new track
  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl.trim() || !title.trim() || !artist.trim()) return

    setLoading(true)
    try {
      await RadioCafeService.addTrack({
        title: title.trim(),
        artist: artist.trim(),
        youtube_url: youtubeUrl.trim()
      })

      setYoutubeUrl('')
      setTitle('')
      setArtist('')
      await loadTracks()
    } catch (error) {
      console.error('Error adding track:', error)
      alert('Failed to add track. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userRole')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Radio Cafe Admin</h1>
              <p className="text-gray-600">Manage YouTube music downloads for the cafe</p>
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Tracks</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Track */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add New Track</span>
            </CardTitle>
            <CardDescription>
              Add a YouTube URL to download audio for the cafe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTrack} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube URL</label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Song title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Artist</label>
                  <Input
                    placeholder="Artist name"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Track...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Track
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tracks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Music className="h-5 w-5" />
              <span>Music Library ({tracks.length} tracks)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track Info</TableHead>
                    <TableHead>YouTube</TableHead>
                    <TableHead>File Info</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tracks.map((track) => (
                    <TableRow key={track.id}>
                      <TableCell>
                        {editingTrack === track.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Title"
                              className="text-sm"
                            />
                            <Input
                              value={editArtist}
                              onChange={(e) => setEditArtist(e.target.value)}
                              placeholder="Artist"
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">{track.title}</div>
                            <div className="text-sm text-gray-500">{track.artist}</div>
                            <div className="text-xs text-gray-400">
                              Added: {new Date(track.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {track.thumbnail_url && (
                            <Image 
                              src={track.thumbnail_url} 
                              alt="Thumbnail" 
                              width={48}
                              height={32}
                              className="w-12 h-8 object-cover rounded"
                            />
                          )}
                          <div>
                            <a 
                              href={track.youtube_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm flex items-center space-x-1"
                            >
                              <Youtube className="h-3 w-3" />
                              <span>View</span>
                            </a>
                            {track.youtube_video_id && (
                              <div className="text-xs text-gray-400">ID: {track.youtube_video_id}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {track.file_size && (
                            <div>Size: {RadioCafeService.formatFileSize(track.file_size)}</div>
                          )}
                          {track.duration && (
                            <div>Duration: {RadioCafeService.formatDuration(track.duration)}</div>
                          )}
                          {track.audio_format && (
                            <div>Format: {track.audio_format}</div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {editingTrack === track.id ? (
                            <>
                              <Button
                                onClick={() => handleEditTrack(track.id)}
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={cancelEdit}
                                size="sm"
                                variant="outline"
                                className="text-gray-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => startEdit(track)}
                                size="sm"
                                variant="outline"
                                className="text-blue-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTrack(track.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600"
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
            </div>
            
            {tracks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Music className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No tracks added yet. Add your first YouTube track above!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}