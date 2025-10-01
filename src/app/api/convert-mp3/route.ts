import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

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

      // Generate unique filename for Supabase Storage
      const filename = generateMp3FileName(track)
      const tempFilePath = path.join(tempDir, filename)

      // Download and convert to MP3 using python3 -m yt_dlp
      const ytDlpCommand = [
        'python3', '-m', 'yt_dlp',
        `"${track.youtube_url}"`,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '192K',
        '--output', `"${tempFilePath.replace('.mp3', '.%(ext)s')}"`,
        '--no-playlist'
      ].join(' ')

      console.log('Executing yt-dlp command:', ytDlpCommand)
      
      try {
        await execAsync(ytDlpCommand, { 
          cwd: tempDir,
          timeout: 300000 // 5 minute timeout
        })
      } catch (execError) {
        console.error('yt-dlp execution error:', execError)
        throw new Error(`Video download failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`)
      }

      // Read the file as buffer for upload
      const fileBuffer = await fs.readFile(tempFilePath)
      const fileSizeBytes = fileBuffer.length

      // Get audio duration using yt-dlp info command
      let duration = 0
      try {
        const infoCommand = `python3 -m yt_dlp --print duration "${track.youtube_url}"`
        const { stdout } = await execAsync(infoCommand, { timeout: 60000 })
        duration = Math.round(parseFloat(stdout.trim()) || 0)
      } catch (infoError) {
        console.warn('Failed to get duration, using 0:', infoError)
      }

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

      // Clean up temporary file
      try {
        await fs.unlink(tempFilePath)
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError)
      }

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