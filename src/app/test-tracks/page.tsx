'use client'

import { useEffect, useState } from 'react'
import { HybridStorage } from '@/lib/hybrid-storage'
import type { Track } from '@/lib/supabase'

export default function TestTracks() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTracks = async () => {
      console.log('🧪 Testing track loading...')
      await HybridStorage.init()
      const allTracks = await HybridStorage.getTracks()
      console.log('🧪 All tracks:', allTracks)
      
      const playableTracks = allTracks.filter(track => 
        track.download_status === 'completed' && track.audio_file_url
      )
      console.log('🧪 Playable tracks:', playableTracks)
      
      setTracks(playableTracks)
      setLoading(false)
    }
    
    loadTracks()
  }, [])

  if (loading) {
    return <div style={{padding: '20px'}}>Loading tracks...</div>
  }

  return (
    <div style={{padding: '20px', fontFamily: 'Arial, sans-serif'}}>
      <h1>Track Loading Test</h1>
      <p>Found {tracks.length} playable tracks</p>
      
      {tracks.map((track, index) => (
        <div key={track.id} style={{
          border: '1px solid #ccc',
          padding: '10px',
          margin: '10px 0',
          borderRadius: '5px'
        }}>
          <h3>{track.title}</h3>
          <p><strong>Artist:</strong> {track.artist}</p>
          <p><strong>Download Status:</strong> {track.download_status}</p>
          <p><strong>Audio File URL:</strong> {track.audio_file_url}</p>
          <p><strong>File Size:</strong> {track.file_size ? `${Math.round(track.file_size / 1024 / 1024)}MB` : 'Unknown'}</p>
          <p><strong>Audio Format:</strong> {track.audio_format}</p>
        </div>
      ))}
      
      {tracks.length === 0 && (
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          padding: '15px',
          borderRadius: '5px'
        }}>
          <p><strong>No playable tracks found!</strong></p>
          <p>This means either:</p>
          <ul>
            <li>No tracks have download_status === 'completed'</li>
            <li>No tracks have audio_file_url set</li>
            <li>There's an issue with the storage system</li>
          </ul>
        </div>
      )}
    </div>
  )
}