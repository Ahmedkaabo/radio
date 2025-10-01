import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import ytdl from 'ytdl-core'
import youtubedl from 'youtube-dl-exec'

// Fallback function using youtube-dl-exec
async function downloadWithYoutubeDL(url: string, outputPath: string): Promise<void> {
  console.log('🔄 Trying youtube-dl-exec fallback method...')
  
  try {
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 192,
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ]
    })
    console.log('✅ youtube-dl-exec download successful!')
  } catch (error) {
    console.error('❌ youtube-dl-exec also failed:', error)
    throw new Error('Both primary and fallback YouTube methods failed. This video may be restricted.')
  }
}

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

      // Debug: Log the normalized URL
      console.log('🔍 Attempting to access video:', normalizedUrl)
      
      // Get video info with multiple retry strategies
      let info
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
      
      let lastError: unknown
      
      for (let i = 0; i < userAgents.length; i++) {
        try {
          console.log(`🔄 Attempt ${i + 1}/${userAgents.length} with User-Agent: ${userAgents[i].substring(0, 50)}...`)
          
          info = await ytdl.getInfo(normalizedUrl, {
            requestOptions: {
              headers: {
                'User-Agent': userAgents[i],
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            }
          })
          
          console.log('✅ Successfully retrieved video info!')
          break
          
        } catch (attemptError: unknown) {
          console.error(`❌ Attempt ${i + 1} failed:`, attemptError)
          lastError = attemptError
          
          if (i < userAgents.length - 1) {
            console.log('⏳ Waiting 2 seconds before next attempt...')
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
      }
      
      if (!info) {
        console.error('🚫 All attempts failed. Last error:', lastError)
        
        const error = lastError as { statusCode?: number; message?: string }
        const errorMessage = error.message || 'Unknown error'
        
        // Enhanced error detection with debugging info
        console.log('🔍 Error details:', { statusCode: error.statusCode, message: errorMessage })
        
        if (error.statusCode === 410 || errorMessage.includes('Video unavailable')) {
          throw new Error('⚠️ Video unavailable: This video may be blocked in your region, set to private, or removed by the uploader. All YouTube access attempts failed.')
        } else if (error.statusCode === 403 || errorMessage.includes('Sign in to confirm')) {
          throw new Error('🔒 Access restricted: This video requires sign-in or may be age-restricted. YouTube is blocking all access attempts.')
        } else if (error.statusCode === 404 || errorMessage.includes('Video not found')) {
          throw new Error('❌ Video not found: Please verify the URL is correct and the video exists.')
        } else if (errorMessage.includes('unavailable') || errorMessage.includes('private')) {
          throw new Error('🚫 Video unavailable: The video is private, deleted, or restricted.')
        } else if (errorMessage.includes('region')) {
          throw new Error('🌍 Geographic restriction: This video is not available in your region.')
        } else if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
          throw new Error('🚦 Rate limited: YouTube is temporarily blocking requests. Please try again in a few minutes.')
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
          throw new Error('🌐 Network error: Cannot connect to YouTube. Please check your internet connection.')
        } else {
          throw new Error(`🛑 YouTube access blocked: ${errorMessage}. This may be due to regional restrictions or YouTube's anti-bot measures.`)
        }
      }

      // Enhanced video validation
      if (!info || !info.videoDetails) {
        throw new Error('📋 No video information available: The video metadata could not be retrieved.')
      }
      
      if (!info.videoDetails.videoId) {
        throw new Error('🆔 Invalid video: No video ID found in the response.')
      }

      // Check if video is actually playable
      if (info.videoDetails.isPrivate) {
        throw new Error('🔒 Private video: This video is set to private and cannot be downloaded.')
      }

      // Check if it's live content (which may not be downloadable)
      if (info.videoDetails.isLiveContent) {
        throw new Error('📺 Live content: Live streams and premieres may not be downloadable. Please try after the stream ends.')
      }

      // Check if video is too long (limit to 30 minutes to prevent abuse)
      const duration = Math.round(info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : 0)
      if (duration > 1800) { // 30 minutes
        throw new Error('Video is too long (maximum 30 minutes allowed)')
      }

      // Enhanced format selection with multiple fallbacks
      let audioFormat
      
      // Check if formats are available
      if (!info.formats || info.formats.length === 0) {
        throw new Error('🎵 No audio formats: This video has no downloadable audio streams available.')
      }

      try {
        // Try to get highest quality audio-only format
        audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        })
      } catch {
        try {
          // Fallback: any format with audio (may include video)
          audioFormat = ytdl.chooseFormat(info.formats, { 
            filter: format => format.hasAudio && !format.hasVideo
          })
        } catch {
          try {
            // Last resort: any format with audio (including video formats)
            audioFormat = ytdl.chooseFormat(info.formats, { 
              filter: format => format.hasAudio
            })
          } catch {
            throw new Error('🔇 No audio available: This video contains no downloadable audio streams.')
          }
        }
      }

      if (!audioFormat) {
        throw new Error('🚫 Audio extraction failed: Could not find a suitable audio format for this video.')
      }

      console.log('Downloading audio:', {
        title: info.videoDetails.title,
        duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
        format: audioFormat.container || 'unknown',
        quality: audioFormat.audioBitrate || 'unknown'
      })

      // Try ytdl-core first, then fallback to youtube-dl-exec
      let fileBuffer: Buffer
      
      try {
        console.log('🎵 Downloading with ytdl-core...')
        
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
        fileBuffer = Buffer.concat(chunks)
        console.log('✅ ytdl-core download successful!')
        
      } catch (downloadError) {
        console.error('❌ ytdl-core download failed:', downloadError)
        console.log('🔄 Trying youtube-dl-exec fallback...')
        
        // Fallback to youtube-dl-exec
        const fallbackFileName = `fallback_${Date.now()}.mp3`
        const fallbackPath = path.join(tempDir, fallbackFileName)
        
        try {
          await downloadWithYoutubeDL(normalizedUrl, fallbackPath)
          fileBuffer = await fs.readFile(fallbackPath)
          
          // Clean up the fallback file
          await fs.unlink(fallbackPath).catch(() => {})
          console.log('✅ youtube-dl-exec fallback successful!')
          
        } catch (fallbackError) {
          throw new Error(`Both download methods failed. Primary: ${downloadError}. Fallback: ${fallbackError}`)
        }
      }
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