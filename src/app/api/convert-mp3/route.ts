import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import ytdl from '@distube/ytdl-core'
import youtubedl from 'youtube-dl-exec'

export async function POST(request: NextRequest) {
  // Store original working directory
  const originalCwd = process.cwd()
  
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

      // Change working directory to writable temp dir to prevent EROFS errors
      process.chdir(tempDir)
      console.log('🔧 Changed working directory to:', tempDir)

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

      // Production-ready YouTube download with multiple fallbacks
      console.log('🎵 Starting production YouTube audio extraction...')
      
      let audioData: Buffer | null = null
      let videoInfo: { title: string; duration: string } | null = null
      let downloadMethod = 'unknown'

      // Method 1: Try youtube-dl-exec first (more robust for production)
      try {
        console.log('📡 Trying youtube-dl-exec (Method 1)...')
        
        const outputPath = path.join(tempDir, `${filename}.%(ext)s`)
        
        await youtubedl(youtubeUrl, {
          format: 'bestaudio[ext=m4a]/bestaudio/best',
          output: outputPath,
          extractAudio: true,
          audioFormat: 'mp3',
          audioQuality: 0, // best quality
          noPlaylist: true,
          // maxDuration handled separately - 30 minutes max
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        // Find the downloaded file
        const files = await fs.readdir(tempDir)
        const downloadedFile = files.find(f => f.includes(filename) && f.endsWith('.mp3'))
        
        if (downloadedFile) {
          audioData = await fs.readFile(path.join(tempDir, downloadedFile))
          downloadMethod = 'youtube-dl-exec'
          videoInfo = { title: track.title || 'Unknown', duration: 'unknown' }
          console.log('✅ Success with youtube-dl-exec')
        } else {
          throw new Error('Downloaded file not found')
        }
        
      } catch (youtubeDlError) {
        console.log('❌ youtube-dl-exec failed:', youtubeDlError instanceof Error ? youtubeDlError.message : 'Unknown error')
        
        // Method 2: Fallback to @distube/ytdl-core
        try {
          console.log('📡 Trying @distube/ytdl-core (Method 2)...')
          
          // Set environment for ytdl-core
          process.env.YTDL_NO_UPDATE = 'true'
          if (process.env.TMPDIR) {
            process.env.YTDL_CACHE_DIR = tempDir
          }
          
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

          videoInfo = {
            title: info.videoDetails.title,
            duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
          }

          // Download audio using @distube/ytdl-core
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

          audioData = Buffer.concat(chunks)
          downloadMethod = '@distube/ytdl-core'
          console.log('✅ Success with @distube/ytdl-core')
          
        } catch (ytdlCoreError) {
          console.log('❌ @distube/ytdl-core failed:', ytdlCoreError instanceof Error ? ytdlCoreError.message : 'Unknown error')
          throw new Error('All download methods failed. YouTube may have changed their structure or the video may be restricted.')
        }
      }

      if (!audioData) {
        throw new Error('No audio data obtained from any download method')
      }

      console.log('🎵 Audio extracted successfully using:', downloadMethod)
      console.log('📊 Video info:', videoInfo)

      const fileSizeBytes = audioData.length

      console.log('Audio downloaded:', {
        size: `${Math.round(fileSizeBytes / 1024 / 1024 * 100) / 100} MB`
      })

      // Upload to Supabase Storage
      const supabaseServiceRole = createServiceRoleClient()
      
      const { error: uploadError } = await supabaseServiceRole.storage
        .from('mp3-files')
        .upload(filename, audioData, {
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
          duration: videoInfo?.duration || null,
          error_message: null
        })
        .eq('id', trackId)

      return NextResponse.json({
        success: true,
        mp3_file_path: publicUrl,
        file_size: fileSizeBytes,
        duration: videoInfo?.duration || 'unknown',
        method: downloadMethod
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
  } finally {
    // Always restore original working directory
    try {
      process.chdir(originalCwd)
    } catch (e) {
      console.warn('Could not restore working directory:', e)
    }
  }
}