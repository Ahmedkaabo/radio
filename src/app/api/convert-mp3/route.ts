import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import ytdl from '@distube/ytdl-core'

export async function POST(request: NextRequest) {
  try {
    const { trackId } = await request.json()

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
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

      // Generate unique filename for Supabase Storage
      const baseFilename = generateMp3FileName(track)
      const filename = baseFilename

      // Use YouTube URL exactly as provided - only add https:// if completely missing
      let youtubeUrl = track.youtube_url.trim()
      
      // Only add protocol if the URL doesn't start with http:// or https://
      if (!youtubeUrl.startsWith('http://') && !youtubeUrl.startsWith('https://')) {
        youtubeUrl = 'https://' + youtubeUrl
      }

      console.log('🔍 Original URL:', track.youtube_url)
      console.log('🔍 Processing URL:', youtubeUrl)
      
      // Configure ytdl-core with browser-like options and writable temp directory
      const ytdlOptions = {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        }
      }

      // Set ytdl-core to use our writable temp directory for any cache files
      process.env.YTDL_NO_UPDATE = 'true'
      if (process.env.TMPDIR) {
        process.env.YTDL_CACHE_DIR = tempDir
      }
      
      // Get video info using @distube/ytdl-core with browser-like headers
      const info = await ytdl.getInfo(youtubeUrl, ytdlOptions)
      
      // Basic validation
      if (!info.videoDetails) {
        throw new Error('Video information not available')
      }

      // Check duration (max 30 minutes)
      const duration = parseInt(info.videoDetails.lengthSeconds || '0')
      if (duration > 1800) {
        throw new Error('Video is too long (maximum 30 minutes allowed)')
      }

      console.log('Video info:', {
        title: info.videoDetails.title,
        duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
      })

      // Download audio using @distube/ytdl-core with browser-like headers
      const audioStream = ytdl(youtubeUrl, { 
        filter: 'audioonly',
        quality: 'highestaudio',
        ...ytdlOptions
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

        // Add timeout (5 minutes)
        setTimeout(() => {
          audioStream.destroy()
          reject(new Error('Download timeout'))
        }, 300000)
      })

      const fileBuffer = Buffer.concat(chunks)
      const fileSizeBytes = fileBuffer.length

      console.log('Audio downloaded:', {
        size: `${Math.round(fileSizeBytes / 1024 / 1024 * 100) / 100} MB`
      })

      // Upload to Supabase Storage
      const supabaseServiceRole = createServiceRoleClient()
      
      const { error: uploadError } = await supabaseServiceRole.storage
        .from('mp3-files')
        .upload(filename, fileBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const publicUrl = getStorageUrl(filename)

      // Update database with success
      await supabase
        .from('tracks')
        .update({
          mp3_file_path: publicUrl,
          storage_file_name: filename,
          conversion_status: 'completed',
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