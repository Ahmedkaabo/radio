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

      // Use YouTube URL exactly as provided - no modifications
      const youtubeUrl = track.youtube_url

      console.log('🔍 Processing YouTube URL:', youtubeUrl)
      
      // Get video info using @distube/ytdl-core with default settings
      const info = await ytdl.getInfo(youtubeUrl)
      
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

      // Download audio using @distube/ytdl-core with default settings
      const audioStream = ytdl(youtubeUrl, { 
        filter: 'audioonly',
        quality: 'highestaudio'
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