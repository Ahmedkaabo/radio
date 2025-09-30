'use client''use client''use client'



import { useState, useEffect } from 'react'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'import { useState, useEffect } from 'react'import { useState, useEffect } from 'react'

import { Input } from '@/components/ui/input'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'import { useRouter } from 'next/navigation'import { useRouter } from 'next/navigation'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Plus, Trash2, Edit2, LogOut, Save, X } from 'lucide-react'import { Button } from '@/components/ui/button'import { Button } from '@/components/ui/button'

import { MusicService } from '@/lib/music-service'

import type { Track } from '@/lib/types'import { Input } from '@/components/ui/input'import { Input } from '@/components/ui/input'



export default function AdminPage() {import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

  const router = useRouter()

  const [tracks, setTracks] = useState<Track[]>([])import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

  const [loading, setLoading] = useState(false)

  import { Plus, Trash2, Edit2, LogOut, Save, X } from 'lucide-react'import { Plus, Trash2, Edit2, LogOut, Save, X } from 'lucide-react'

  // Add track form

  const [title, setTitle] = useState('')import { MusicService } from '@/lib/music-service'import { MusicService } from '@/lib/music-service'

  const [artist, setArtist] = useState('')

  const [youtubeUrl, setYoutubeUrl] = useState('')import type { Track } from '@/lib/types'import type { Track } from '@/lib/types'

  

  // Edit track

  const [editingId, setEditingId] = useState<string | null>(null)

  const [editTitle, setEditTitle] = useState('')export default function AdminPage() {export default function AdminDashboard() {

  const [editArtist, setEditArtist] = useState('')

  const router = useRouter()  const router = useRouter()

  // Load tracks

  const loadTracks = async () => {  const [tracks, setTracks] = useState<Track[]>([])  

    try {

      const data = await MusicService.getAllTracks()  const [loading, setLoading] = useState(false)  // State declarations

      setTracks(data)

    } catch (error) {    const [tracks, setTracks] = useState<Track[]>([])

      console.error('Failed to load tracks:', error)

    }  // Add track form  const [youtubeUrl, setYoutubeUrl] = useState('')

  }

  const [title, setTitle] = useState('')  const [title, setTitle] = useState('')

  // Check auth and load tracks

  useEffect(() => {  const [artist, setArtist] = useState('')  const [artist, setArtist] = useState('')

    const userRole = localStorage.getItem('userRole')

    if (userRole !== 'admin') {  const [youtubeUrl, setYoutubeUrl] = useState('')  const [loading, setLoading] = useState(false)

      router.push('/login')

      return    const [editingTrack, setEditingTrack] = useState<string | null>(null)

    }

    loadTracks()  // Edit track  const [editTitle, setEditTitle] = useState('')

  }, [router])

  const [editingId, setEditingId] = useState<string | null>(null)  const [editArtist, setEditArtist] = useState('')

  // Add new track

  const handleAddTrack = async () => {  const [editTitle, setEditTitle] = useState('')  const [stats, setStats] = useState({

    if (!title.trim() || !artist.trim() || !youtubeUrl.trim()) return

  const [editArtist, setEditArtist] = useState('')    total: 0

    setLoading(true)

    try {  })

      await MusicService.addTrack({

        title: title.trim(),  // Load tracks

        artist: artist.trim(),

        youtube_url: youtubeUrl.trim()  const loadTracks = async () => {  // Load tracks function

      })

          try {  const loadTracks = useCallback(async () => {

      setTitle('')

      setArtist('')      const data = await MusicService.getAllTracks()    try {

      setYoutubeUrl('')

      await loadTracks()      setTracks(data)      const loadedTracks = await RadioCafeService.getAllTracks()

    } catch (error) {

      console.error('Failed to add track:', error)    } catch (error) {      setTracks(loadedTracks)

    } finally {

      setLoading(false)      console.error('Failed to load tracks:', error)      setStats({ total: loadedTracks.length })

    }

  }    }    } catch (error) {



  // Start editing  }      console.error('Failed to load tracks:', error)

  const startEdit = (track: Track) => {

    setEditingId(track.id)    }

    setEditTitle(track.title)

    setEditArtist(track.artist)  // Check auth and load tracks  }, [])

  }

  useEffect(() => {

  // Save edit

  const saveEdit = async () => {    const userRole = localStorage.getItem('userRole')  // Authentication and data loading effect

    if (!editingId || !editTitle.trim() || !editArtist.trim()) return

    if (userRole !== 'admin') {  useEffect(() => {

    setLoading(true)

    try {      router.push('/login')    // Check authentication

      await MusicService.updateTrack(editingId, {

        title: editTitle.trim(),      return    const userRole = localStorage.getItem('userRole')

        artist: editArtist.trim()

      })    }    if (userRole !== 'admin') {

      setEditingId(null)

      await loadTracks()    loadTracks()      router.push('/login')

    } catch (error) {

      console.error('Failed to update track:', error)  }, [router])      return

    } finally {

      setLoading(false)    }

    }

  }  // Add new track



  // Cancel edit  const handleAddTrack = async () => {    loadTracks()

  const cancelEdit = () => {

    setEditingId(null)    if (!title.trim() || !artist.trim() || !youtubeUrl.trim()) return    // Refresh tracks every 30 seconds

    setEditTitle('')

    setEditArtist('')    const interval = setInterval(loadTracks, 30000)

  }

    setLoading(true)    return () => clearInterval(interval)

  // Delete track

  const deleteTrack = async (id: string) => {    try {  }, [router, loadTracks])

    if (!confirm('Delete this track?')) return

      await MusicService.addTrack({

    setLoading(true)

    try {        title: title.trim(),  // Handle track editing

      await MusicService.deleteTrack(id)

      await loadTracks()        artist: artist.trim(),  const handleEditTrack = async (trackId: string) => {

    } catch (error) {

      console.error('Failed to delete track:', error)        youtube_url: youtubeUrl.trim()    if (!editTitle.trim() || !editArtist.trim()) return

    } finally {

      setLoading(false)      })

    }

  }          try {



  // Logout      setTitle('')      await RadioCafeService.updateTrack(trackId, {

  const handleLogout = () => {

    localStorage.removeItem('userRole')      setArtist('')        title: editTitle.trim(),

    router.push('/login')

  }      setYoutubeUrl('')        artist: editArtist.trim()



  return (      await loadTracks()      })

    <div className="min-h-screen bg-gray-50 p-6">

      <div className="max-w-6xl mx-auto">    } catch (error) {

        <div className="flex justify-between items-center mb-6">

          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>      console.error('Failed to add track:', error)      setEditingTrack(null)

          <Button onClick={handleLogout} variant="outline">

            <LogOut className="h-4 w-4 mr-2" />    } finally {      setEditTitle('')

            Logout

          </Button>      setLoading(false)      setEditArtist('')

        </div>

    }      await loadTracks()

        <Card className="mb-6">

          <CardHeader>  }    } catch (error) {

            <CardTitle>Add New Track</CardTitle>

          </CardHeader>      console.error('Error updating track:', error)

          <CardContent>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">  // Start editing      alert('Failed to update track. Please try again.')

              <Input

                placeholder="Song Title"  const startEdit = (track: Track) => {    }

                value={title}

                onChange={(e) => setTitle(e.target.value)}    setEditingId(track.id)  }

              />

              <Input    setEditTitle(track.title)

                placeholder="Artist Name"

                value={artist}    setEditArtist(track.artist)  // Start editing a track

                onChange={(e) => setArtist(e.target.value)}

              />  }  const startEdit = (track: Track) => {

              <Input

                placeholder="YouTube URL"    setEditingTrack(track.id)

                value={youtubeUrl}

                onChange={(e) => setYoutubeUrl(e.target.value)}  // Save edit    setEditTitle(track.title)

              />

              <Button   const saveEdit = async () => {    setEditArtist(track.artist)

                onClick={handleAddTrack} 

                disabled={loading || !title || !artist || !youtubeUrl}    if (!editingId || !editTitle.trim() || !editArtist.trim()) return  }

              >

                <Plus className="h-4 w-4 mr-2" />

                Add Track

              </Button>    setLoading(true)  // Cancel editing

            </div>

          </CardContent>    try {  const cancelEdit = () => {

        </Card>

      await MusicService.updateTrack(editingId, {    setEditingTrack(null)

        <Card>

          <CardHeader>        title: editTitle.trim(),    setEditTitle('')

            <CardTitle>All Tracks ({tracks.length})</CardTitle>

          </CardHeader>        artist: editArtist.trim()    setEditArtist('')

          <CardContent>

            {tracks.length === 0 ? (      })  }

              <div className="text-center py-8 text-gray-500">

                <p>No tracks yet. Add some YouTube songs above!</p>      setEditingId(null)

              </div>

            ) : (      await loadTracks()  // Handle track deletion

              <Table>

                <TableHeader>    } catch (error) {  const handleDeleteTrack = async (trackId: string) => {

                  <TableRow>

                    <TableHead>Song</TableHead>      console.error('Failed to update track:', error)    if (!confirm('Are you sure you want to delete this track?')) return

                    <TableHead>YouTube</TableHead>

                    <TableHead>Added</TableHead>    } finally {

                    <TableHead>Actions</TableHead>

                  </TableRow>      setLoading(false)    try {

                </TableHeader>

                <TableBody>    }      await RadioCafeService.deleteTrack(trackId)

                  {tracks.map((track) => (

                    <TableRow key={track.id}>  }      await loadTracks()

                      <TableCell>

                        {editingId === track.id ? (    } catch (error) {

                          <div className="space-y-2">

                            <Input  // Cancel edit      console.error('Error deleting track:', error)

                              value={editTitle}

                              onChange={(e) => setEditTitle(e.target.value)}  const cancelEdit = () => {      alert('Failed to delete track. Please try again.')

                              placeholder="Title"

                            />    setEditingId(null)    }

                            <Input

                              value={editArtist}    setEditTitle('')  }

                              onChange={(e) => setEditArtist(e.target.value)}

                              placeholder="Artist"    setEditArtist('')

                            />

                          </div>  }  // Handle adding new track

                        ) : (

                          <div>  const handleAddTrack = async (e: React.FormEvent) => {

                            <div className="font-medium">{track.title}</div>

                            <div className="text-sm text-gray-500">{track.artist}</div>  // Delete track    e.preventDefault()

                          </div>

                        )}  const deleteTrack = async (id: string) => {    if (!youtubeUrl.trim() || !title.trim() || !artist.trim()) return

                      </TableCell>

                      <TableCell>    if (!confirm('Delete this track?')) return

                        <a 

                          href={track.youtube_url}     setLoading(true)

                          target="_blank" 

                          rel="noopener noreferrer"    setLoading(true)    try {

                          className="text-blue-600 hover:underline text-sm"

                        >    try {      await RadioCafeService.addTrack({

                          Watch Video

                        </a>      await MusicService.deleteTrack(id)        title: title.trim(),

                        {track.youtube_video_id && (

                          <div className="text-xs text-gray-400 mt-1">      await loadTracks()        artist: artist.trim(),

                            ID: {track.youtube_video_id}

                          </div>    } catch (error) {        youtube_url: youtubeUrl.trim()

                        )}

                      </TableCell>      console.error('Failed to delete track:', error)      })

                      <TableCell>

                        <div className="text-sm text-gray-500">    } finally {

                          {new Date(track.created_at).toLocaleDateString()}

                        </div>      setLoading(false)      setYoutubeUrl('')

                      </TableCell>

                      <TableCell>    }      setTitle('')

                        <div className="flex space-x-2">

                          {editingId === track.id ? (  }      setArtist('')

                            <>

                              <Button      await loadTracks()

                                size="sm"

                                onClick={saveEdit}  // Logout    } catch (error) {

                                disabled={loading}

                              >  const handleLogout = () => {      console.error('Error adding track:', error)

                                <Save className="h-3 w-3" />

                              </Button>    localStorage.removeItem('userRole')      alert('Failed to add track. Please try again.')

                              <Button

                                size="sm"    router.push('/login')    } finally {

                                variant="outline"

                                onClick={cancelEdit}  }      setLoading(false)

                              >

                                <X className="h-3 w-3" />    }

                              </Button>

                            </>  return (  }

                          ) : (

                            <>    <div className="min-h-screen bg-gray-50 p-6">

                              <Button

                                size="sm"      <div className="max-w-6xl mx-auto">  // Handle logout

                                variant="outline"

                                onClick={() => startEdit(track)}        {/* Header */}  const handleLogout = () => {

                              >

                                <Edit2 className="h-3 w-3" />        <div className="flex justify-between items-center mb-6">    localStorage.removeItem('userRole')

                              </Button>

                              <Button          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>    router.push('/login')

                                size="sm"

                                variant="destructive"          <Button onClick={handleLogout} variant="outline">  }

                                onClick={() => deleteTrack(track.id)}

                                disabled={loading}            <LogOut className="h-4 w-4 mr-2" />

                              >

                                <Trash2 className="h-3 w-3" />            Logout  return (

                              </Button>

                            </>          </Button>    <div className="min-h-screen bg-gray-50 p-4">

                          )}

                        </div>        </div>      <div className="max-w-7xl mx-auto space-y-6">

                      </TableCell>

                    </TableRow>        {/* Header */}

                  ))}

                </TableBody>        {/* Add Track Form */}        <div className="flex items-center justify-between">

              </Table>

            )}        <Card className="mb-6">          <div className="flex items-center space-x-3">

          </CardContent>

        </Card>          <CardHeader>            <Shield className="h-8 w-8 text-blue-600" />

      </div>

    </div>            <CardTitle>Add New Track</CardTitle>            <div>

  )

}          </CardHeader>              <h1 className="text-2xl font-bold text-gray-900">Radio Cafe Admin</h1>

          <CardContent>              <p className="text-gray-600">Manage YouTube music downloads for the cafe</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">            </div>

              <Input          </div>

                placeholder="Song Title"          <Button 

                value={title}            onClick={handleLogout}

                onChange={(e) => setTitle(e.target.value)}            variant="outline" 

              />            size="sm"

              <Input            className="flex items-center space-x-2"

                placeholder="Artist Name"          >

                value={artist}            <LogOut className="h-4 w-4" />

                onChange={(e) => setArtist(e.target.value)}            <span>Logout</span>

              />          </Button>

              <Input        </div>

                placeholder="YouTube URL"

                value={youtubeUrl}        {/* Stats Card */}

                onChange={(e) => setYoutubeUrl(e.target.value)}        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">

              />          <Card>

              <Button             <CardContent className="p-4">

                onClick={handleAddTrack}               <div className="text-center">

                disabled={loading || !title || !artist || !youtubeUrl}                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>

              >                <div className="text-sm text-gray-600">Total Tracks</div>

                <Plus className="h-4 w-4 mr-2" />              </div>

                Add Track            </CardContent>

              </Button>          </Card>

            </div>        </div>

          </CardContent>

        </Card>        {/* Add New Track */}

        <Card>

        {/* Tracks Table */}          <CardHeader>

        <Card>            <CardTitle className="flex items-center space-x-2">

          <CardHeader>              <Plus className="h-5 w-5" />

            <CardTitle>All Tracks ({tracks.length})</CardTitle>              <span>Add New Track</span>

          </CardHeader>            </CardTitle>

          <CardContent>            <CardDescription>

            {tracks.length === 0 ? (              Add a YouTube URL to download audio for the cafe

              <div className="text-center py-8 text-gray-500">            </CardDescription>

                <p>No tracks yet. Add some YouTube songs above!</p>          </CardHeader>

              </div>          <CardContent>

            ) : (            <form onSubmit={handleAddTrack} className="space-y-4">

              <Table>              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <TableHeader>                <div className="space-y-2">

                  <TableRow>                  <label className="text-sm font-medium">YouTube URL</label>

                    <TableHead>Song</TableHead>                  <Input

                    <TableHead>YouTube</TableHead>                    type="url"

                    <TableHead>Added</TableHead>                    placeholder="https://youtube.com/watch?v=..."

                    <TableHead>Actions</TableHead>                    value={youtubeUrl}

                  </TableRow>                    onChange={(e) => setYoutubeUrl(e.target.value)}

                </TableHeader>                    required

                <TableBody>                  />

                  {tracks.map((track) => (                </div>

                    <TableRow key={track.id}>                <div className="space-y-2">

                      <TableCell>                  <label className="text-sm font-medium">Title</label>

                        {editingId === track.id ? (                  <Input

                          <div className="space-y-2">                    placeholder="Song title"

                            <Input                    value={title}

                              value={editTitle}                    onChange={(e) => setTitle(e.target.value)}

                              onChange={(e) => setEditTitle(e.target.value)}                    required

                              placeholder="Title"                  />

                            />                </div>

                            <Input                <div className="space-y-2">

                              value={editArtist}                  <label className="text-sm font-medium">Artist</label>

                              onChange={(e) => setEditArtist(e.target.value)}                  <Input

                              placeholder="Artist"                    placeholder="Artist name"

                            />                    value={artist}

                          </div>                    onChange={(e) => setArtist(e.target.value)}

                        ) : (                    required

                          <div>                  />

                            <div className="font-medium">{track.title}</div>                </div>

                            <div className="text-sm text-gray-500">{track.artist}</div>              </div>

                          </div>              <Button type="submit" disabled={loading} className="w-full md:w-auto">

                        )}                {loading ? (

                      </TableCell>                  <>

                      <TableCell>                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />

                        <a                     Adding Track...

                          href={track.youtube_url}                   </>

                          target="_blank"                 ) : (

                          rel="noopener noreferrer"                  <>

                          className="text-blue-600 hover:underline text-sm"                    <Plus className="mr-2 h-4 w-4" />

                        >                    Add Track

                          Watch Video                  </>

                        </a>                )}

                        {track.youtube_video_id && (              </Button>

                          <div className="text-xs text-gray-400 mt-1">            </form>

                            ID: {track.youtube_video_id}          </CardContent>

                          </div>        </Card>

                        )}

                      </TableCell>        {/* Tracks List */}

                      <TableCell>        <Card>

                        <div className="text-sm text-gray-500">          <CardHeader>

                          {new Date(track.created_at).toLocaleDateString()}            <CardTitle className="flex items-center space-x-2">

                        </div>              <Music className="h-5 w-5" />

                      </TableCell>              <span>Music Library ({tracks.length} tracks)</span>

                      <TableCell>            </CardTitle>

                        <div className="flex space-x-2">          </CardHeader>

                          {editingId === track.id ? (          <CardContent>

                            <>            <div className="overflow-x-auto">

                              <Button              <Table>

                                size="sm"                <TableHeader>

                                onClick={saveEdit}                  <TableRow>

                                disabled={loading}                    <TableHead>Track Info</TableHead>

                              >                    <TableHead>YouTube</TableHead>

                                <Save className="h-3 w-3" />                    <TableHead>File Info</TableHead>

                              </Button>                    <TableHead>Actions</TableHead>

                              <Button                  </TableRow>

                                size="sm"                </TableHeader>

                                variant="outline"                <TableBody>

                                onClick={cancelEdit}                  {tracks.map((track) => (

                              >                    <TableRow key={track.id}>

                                <X className="h-3 w-3" />                      <TableCell>

                              </Button>                        {editingTrack === track.id ? (

                            </>                          <div className="space-y-2">

                          ) : (                            <Input

                            <>                              value={editTitle}

                              <Button                              onChange={(e) => setEditTitle(e.target.value)}

                                size="sm"                              placeholder="Title"

                                variant="outline"                              className="text-sm"

                                onClick={() => startEdit(track)}                            />

                              >                            <Input

                                <Edit2 className="h-3 w-3" />                              value={editArtist}

                              </Button>                              onChange={(e) => setEditArtist(e.target.value)}

                              <Button                              placeholder="Artist"

                                size="sm"                              className="text-sm"

                                variant="destructive"                            />

                                onClick={() => deleteTrack(track.id)}                          </div>

                                disabled={loading}                        ) : (

                              >                          <div>

                                <Trash2 className="h-3 w-3" />                            <div className="font-medium text-gray-900">{track.title}</div>

                              </Button>                            <div className="text-sm text-gray-500">{track.artist}</div>

                            </>                            <div className="text-xs text-gray-400">

                          )}                              Added: {new Date(track.created_at).toLocaleDateString()}

                        </div>                            </div>

                      </TableCell>                          </div>

                    </TableRow>                        )}

                  ))}                      </TableCell>

                </TableBody>                      

              </Table>                      <TableCell>

            )}                        <div className="flex items-center space-x-2">

          </CardContent>                          {track.thumbnail_url && (

        </Card>                            <Image 

      </div>                              src={track.thumbnail_url} 

    </div>                              alt="Thumbnail" 

  )                              width={48}

}                              height={32}
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
                          <div>Format: MP3</div>
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