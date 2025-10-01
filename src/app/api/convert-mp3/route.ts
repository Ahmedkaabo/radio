import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import ytdl from 'ytdl-core'

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
      // Create temporary directory for processing
      const tempDir = path.join(os.tmpdir(), 'radio-cafe-conversion')
      await fs.mkdir(tempDir, { recursive: true })

      // Generate unique filename for Supabase Storage (we'll use the original audio format)
      const baseFilename = generateMp3FileName(track)
      const filename = baseFilename // Keep as .mp3 for consistency in the UI

      // Normalize and validate YouTube URL
      let normalizedUrl = track.youtube_url.trim()
      
      // Add https:// if missing
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
      }
      
      // Convert shortened URLs to full URLs
      if (normalizedUrl.includes('youtu.be/')) {
        const videoId = normalizedUrl.split('youtu.be/')[1]?.split('?')[0]
        if (videoId) {
          normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`
        }
      }
      
      console.log('Processing URL:', normalizedUrl)
      
      if (!ytdl.validateURL(normalizedUrl)) {
        throw new Error('Invalid YouTube URL format. Please use a valid YouTube video URL.')
      }

      // Get video info with better error handling
      let info
      try {
        info = await ytdl.getInfo(normalizedUrl)
      } catch (infoError: any) {
        console.error('Failed to get video info:', infoError)
        
        if (infoError.statusCode === 410) {
          throw new Error('This video is not available for download (blocked by YouTube). Please try a different video.')
        } else if (infoError.statusCode === 403) {
          throw new Error('Access denied. This video may be private or restricted.')
        } else if (infoError.statusCode === 404) {
          throw new Error('Video not found. Please check the URL and try again.')
        } else {
          throw new Error(`Unable to access video: ${infoError.message || 'Unknown error'}`)
        }
      }

      // Check if video is available
      if (!info.videoDetails || !info.videoDetails.videoId) {
        throw new Error('Video information not available')
      }

      // Check if video is too long (limit to 30 minutes to prevent abuse)
      const duration = Math.round(info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : 0)
      if (duration > 1800) { // 30 minutes
        throw new Error('Video is too long (maximum 30 minutes allowed)')
      }

      // Download audio stream with better format selection
      let audioFormat
      try {
        audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        })
      } catch (formatError) {
        // Fallback to any audio format
        audioFormat = ytdl.chooseFormat(info.formats, { 
          filter: format => format.hasAudio && !format.hasVideo
        })
      }

      if (!audioFormat) {
        throw new Error('No downloadable audio format found for this video')
      }

      console.log('Downloading audio:', {
        title: info.videoDetails.title,
        duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
        format: audioFormat.container || 'unknown',
        quality: audioFormat.audioBitrate || 'unknown'
      })

      // Create audio stream with additional options
      const audioStream = ytdl(normalizedUrl, { 
        format: audioFormat,
        quality: 'highestaudio',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      })

      // Collect audio data in memory
      const chunks: Buffer[] = []
      
      await new Promise<void>((resolve, reject) => {
        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        
        audioStream.on('end', () => {
          resolve()
        })
        
        audioStream.on('error', (error) => {
          reject(new Error(`Audio download failed: ${error.message}`))
        })

        // Add timeout
        setTimeout(() => {
          audioStream.destroy()
          reject(new Error('Download timeout (5 minutes)'))
        }, 300000) // 5 minutes
      })

      // Combine all chunks into single buffer
      const fileBuffer = Buffer.concat(chunks)
      const fileSizeBytes = fileBuffer.length

      console.log('Audio downloaded:', {
        size: `${Math.round(fileSizeBytes / 1024 / 1024 * 100) / 100} MB`,
        duration: `${duration}s`
      })

      // Upload to Supabase Storage
      const storageClient = createServiceRoleClient()
      const { error: uploadError } = await storageClient.storage
        .from('mp3-files')
        .upload(filename, fileBuffer, {
          contentType: 'audio/mpeg',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Generate public URL
      const publicUrl = getStorageUrl(filename)

      // No temp file cleanup needed since we used in-memory processing

      // Update database with success
      await supabase
        .from('tracks')
        .update({
          conversion_status: 'completed',
          mp3_file_path: publicUrl,
          storage_file_name: filename,
          file_size: fileSizeBytes,
          duration: duration,
          error_message: null
        })
        .eq('id', trackId)

      return NextResponse.json({
        success: true,
        mp3_file_path: publicUrl,
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