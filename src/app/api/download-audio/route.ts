import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)


export async function POST(request: NextRequest) {
  let trackId: string | undefined
  
  try {
    const body = await request.json()
    trackId = body.trackId
    const youtubeUrl = body.youtubeUrl

    if (!trackId || !youtubeUrl) {
      return NextResponse.json(
        { error: 'Track ID and YouTube URL are required' },
        { status: 400 }
      )
    }

  const supabase = createClient()

    // Verify track exists and is pending
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('download_status', 'pending')
      .single()

    if (trackError || !track) {
      return NextResponse.json(
        { error: 'Track not found or already processed' },
        { status: 404 }
      )
    }

    // Update status to downloading
    await supabase
      .from('tracks')
      .update({ 
        download_status: 'downloading',
        error_message: null 
      })
      .eq('id', trackId)

    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(process.cwd(), 'public', 'downloads')
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true })
    }

    // Generate filename with track ID (MP3 format)
    const filename = `${trackId}.mp3`
    const outputPath = path.join(downloadsDir, filename)

    // Use yt-dlp to download and convert to MP3
    // -x extracts audio, --audio-format mp3 converts to MP3
    const command = `/Users/laptop/Library/Python/3.9/bin/yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath.replace('.mp3', '.%(ext)s')}" "${youtubeUrl}"`
    
    console.log('🎵 Downloading audio:', { trackId, youtubeUrl, command })
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 300000 // 5 minute timeout
    })
    
    console.log('📤 yt-dlp stdout:', stdout)
    if (stderr) {
      console.log('⚠️ yt-dlp stderr:', stderr)
    }
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('[download]')) {
      throw new Error(`yt-dlp error: ${stderr}`)
    }

    // Find the downloaded file (yt-dlp creates MP3 files)
    const files = fs.readdirSync(downloadsDir)
    const downloadedFile = files.find(file => 
      file.startsWith(trackId!) && (file.endsWith('.mp3') || file.endsWith('.m4a') || file.endsWith('.webm'))
    )
    
    if (!downloadedFile) {
      throw new Error('Downloaded file not found')
    }

    const finalFilePath = path.join(downloadsDir, downloadedFile)

    const stats = fs.statSync(finalFilePath)
    const fileSize = stats.size

    // Upload to Supabase Storage using supabase-js
    const bucket = 'audio'
    const storagePath = `${trackId}.mp3`
    const fileBuffer = fs.readFileSync(finalFilePath)
    const { error: uploadError } = await supabase
      .storage
      .from(bucket)
      .upload(storagePath, fileBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadError) {
      throw new Error(`Supabase Storage upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    const publicUrl = publicUrlData.publicUrl

    // Try to extract duration using yt-dlp info (optional)
    let duration: number | null = null
    try {
      const infoCommand = `/Users/laptop/Library/Python/3.9/bin/yt-dlp --print duration "${youtubeUrl}"`
      const { stdout: durationOutput } = await execAsync(infoCommand)
      const durationSeconds = parseInt(durationOutput.trim())
      if (!isNaN(durationSeconds)) {
        duration = durationSeconds
      }
    } catch (e) {
      console.log('Could not extract duration:', e)
    }

    // Update track with download completion info
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        download_status: 'completed',
        audio_file_path: storagePath,
        audio_file_url: publicUrl,
        file_size: fileSize,
        audio_format: path.extname(downloadedFile).slice(1) || 'mp3',
        duration: duration,
        error_message: null
      })
      .eq('id', trackId)

    if (updateError) {
      throw new Error(`Failed to update track: ${updateError.message}`)
    }

    console.log('✅ Download completed:', { 
      trackId, 
      filename: downloadedFile, 
      fileSize,
      duration,
      url: publicUrl 
    })

    return NextResponse.json({
      success: true,
      trackId,
      filename: downloadedFile,
      filePath: publicUrl,
      fileSize,
      duration,
      audioFormat: path.extname(downloadedFile).slice(1) || 'mp3'
    })

  } catch (error) {
    console.error('❌ Download error:', error)
    
    // Update track status to failed with error message
    if (trackId) {
      try {
        const supabase = createClient()
        await supabase
          .from('tracks')
          .update({ 
            download_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', trackId)
      } catch (e) {
        console.error('Failed to update error status:', e)
      }
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Download failed',
        trackId 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check download status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackId = searchParams.get('trackId')
    
    if (!trackId) {
      return NextResponse.json(
        { error: 'Track ID required' },
        { status: 400 }
      )
    }

  const supabase = createClient()
    
    const { data: track, error } = await supabase
      .from('tracks')
      .select('id, download_status, audio_file_url, file_size, error_message, duration')
      .eq('id', trackId)
      .single()

    if (error || !track) {
      return NextResponse.json(
        { error: 'Track not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      trackId: track.id,
      status: track.download_status,
      audioFileUrl: track.audio_file_url,
      fileSize: track.file_size,
      duration: track.duration,
      errorMessage: track.error_message
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}