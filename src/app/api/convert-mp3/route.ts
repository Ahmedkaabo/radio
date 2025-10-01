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

      // Validate YouTube URL
      if (!ytdl.validateURL(track.youtube_url)) {
        throw new Error('Invalid YouTube URL')
      }

      // Get video info for duration and quality
      const info = await ytdl.getInfo(track.youtube_url)
      const duration = Math.round(info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : 0)

      // Download audio stream (highest quality audio)
      const audioFormat = ytdl.chooseFormat(info.formats, { 
        quality: 'highestaudio',
        filter: 'audioonly'
      })

      if (!audioFormat) {
        throw new Error('No audio format available for this video')
      }

      console.log('Downloading audio:', {
        title: info.videoDetails.title,
        duration: duration,
        format: audioFormat.container
      })

      // Create audio stream
      const audioStream = ytdl(track.youtube_url, { 
        format: audioFormat,
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