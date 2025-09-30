import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import YTDlpWrap from 'yt-dlp-wrap'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { trackId } = await request.json()
    
    if (!trackId) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get track info
    const { data: track, error: fetchError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()

    if (fetchError || !track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('tracks')
      .update({ conversion_status: 'processing' })
      .eq('id', trackId)

    try {
      // Ensure downloads directory exists
      const downloadsDir = path.join(process.cwd(), 'public', 'downloads')
      await fs.mkdir(downloadsDir, { recursive: true })

      // Generate safe filename
      const safeTitle = track.title.replace(/[^a-zA-Z0-9]/g, '_')
      const safeArtist = track.artist.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${safeArtist}_${safeTitle}_${track.id.slice(0, 8)}.mp3`
      const outputPath = path.join(downloadsDir, filename)

      // Initialize yt-dlp
      const ytDlpWrap = new YTDlpWrap()

      // Download and convert to MP3
      await ytDlpWrap.execPromise([
        track.youtube_url,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '192K',
        '--output', outputPath.replace('.mp3', '.%(ext)s'),
        '--no-playlist'
      ])

      // Get file stats
      const stats = await fs.stat(outputPath)
      const fileSizeBytes = stats.size

      // Get audio duration using yt-dlp info
      const info = await ytDlpWrap.getVideoInfo(track.youtube_url)
      const duration = Math.round(info.duration || 0)

      // Update database with success
      const relativePath = `/downloads/${filename}`
      await supabase
        .from('tracks')
        .update({
          conversion_status: 'completed',
          mp3_file_path: relativePath,
          file_size: fileSizeBytes,
          duration: duration,
          error_message: null
        })
        .eq('id', trackId)

      return NextResponse.json({
        success: true,
        mp3_file_path: relativePath,
        file_size: fileSizeBytes,
        duration: duration
      })

    } catch (conversionError) {
      console.error('Conversion error:', conversionError)
      
      // Update database with error
      await supabase
        .from('tracks')
        .update({
          conversion_status: 'error',
          error_message: conversionError instanceof Error ? conversionError.message : 'Conversion failed'
        })
        .eq('id', trackId)

      return NextResponse.json({
        error: 'Conversion failed',
        details: conversionError instanceof Error ? conversionError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}