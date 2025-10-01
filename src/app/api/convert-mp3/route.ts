import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import YTDlpWrap from 'yt-dlp-wrap'
import ytdl from '@distube/ytdl-core'

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
      


      // Advanced YouTube download with multiple methods and retry logic
      console.log('🎵 Starting advanced YouTube audio extraction with retry logic...')
      
      let audioData: Buffer | null = null
      let videoInfo: { title: string; duration: string } | null = null
      let downloadMethod = 'unknown'

      // Retry function with exponential backoff
      const retryWithBackoff = async <T>(
        fn: () => Promise<T>, 
        maxRetries: number = 3, 
        baseDelay: number = 1000
      ): Promise<T> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await fn()
          } catch (error) {
            if (attempt === maxRetries) throw error
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
            console.log(`⏳ Retry ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
        throw new Error('Max retries exceeded')
      }

      // Method 1: yt-dlp (most reliable and actively maintained)
      try {
        console.log('📡 Trying yt-dlp (Method 1 - Most Reliable)...')
        
        await retryWithBackoff(async () => {
          const ytDlpWrap = new YTDlpWrap()
          
          // Create output template for MP3
          const outputTemplate = path.join(tempDir, `${filename}.%(ext)s`)
          
          const ytDlpOptions = [
            youtubeUrl,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '0', // best quality
            '--no-playlist',
            '--max-duration', '1800', // 30 minutes max
            '--output', outputTemplate,
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--cookies-from-browser', 'chrome', // Use Chrome cookies for better success rate
            '--extractor-retries', '3',
            '--fragment-retries', '3',
            '--retry-sleep', 'linear=2',
            '--no-check-certificates'
          ]
          
          console.log('🔄 Running yt-dlp with options:', ytDlpOptions.slice(1).join(' '))
          await ytDlpWrap.exec(ytDlpOptions)
          
          // Find the downloaded file
          const files = await fs.readdir(tempDir)
          const downloadedFile = files.find(f => f.includes(filename) && f.endsWith('.mp3'))
          
          if (!downloadedFile) {
            throw new Error('yt-dlp completed but MP3 file not found')
          }
          
          audioData = await fs.readFile(path.join(tempDir, downloadedFile))
          downloadMethod = 'yt-dlp'
          videoInfo = { title: track.title || 'Unknown', duration: 'unknown' }
          console.log('✅ Success with yt-dlp!')
        })
        
      } catch (ytDlpError) {
        console.log('❌ yt-dlp failed:', ytDlpError instanceof Error ? ytDlpError.message : 'Unknown error')
        
        // Method 2: Fallback to @distube/ytdl-core with enhanced configuration
        try {
          console.log('📡 Trying @distube/ytdl-core (Method 2 - Enhanced Fallback)...')
          
          await retryWithBackoff(async () => {
            // Enhanced ytdl-core configuration
            const enhancedYtdlOptions = {
              requestOptions: {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Accept-Encoding': 'gzip, deflate, br',
                  'Connection': 'keep-alive',
                  'Sec-Fetch-Dest': 'empty',
                  'Sec-Fetch-Mode': 'cors',
                  'Sec-Fetch-Site': 'same-origin',
                  'Cache-Control': 'no-cache',
                  'Pragma': 'no-cache'
                }
              }
            }
            
            // Set environment for ytdl-core
            process.env.YTDL_NO_UPDATE = 'true'
            process.env.YTDL_CACHE_DIR = tempDir
            
            const info = await ytdl.getInfo(youtubeUrl, enhancedYtdlOptions)
            
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
              ...enhancedYtdlOptions
            })

            // Collect audio data in memory with timeout
            const chunks: Buffer[] = []
            
            await new Promise<void>((resolve, reject) => {
              // eslint-disable-next-line prefer-const
              let timeoutId: NodeJS.Timeout | undefined
              
              const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId)
                audioStream.removeAllListeners()
              }
              
              audioStream.on('data', (chunk: Buffer) => {
                chunks.push(chunk)
              })
              
              audioStream.on('end', () => {
                cleanup()
                resolve()
              })
              
              audioStream.on('error', (error) => {
                cleanup()
                reject(new Error(`Audio download failed: ${error.message}`))
              })

              // Set timeout (3 minutes for retry logic)
              timeoutId = setTimeout(() => {
                cleanup()
                audioStream.destroy()
                reject(new Error('Download timeout (3 minutes)'))
              }, 180000)
            })

            audioData = Buffer.concat(chunks)
            downloadMethod = '@distube/ytdl-core (enhanced)'
            console.log('✅ Success with enhanced @distube/ytdl-core!')
          })
          
        } catch (ytdlCoreError) {
          console.log('❌ Enhanced @distube/ytdl-core failed:', ytdlCoreError instanceof Error ? ytdlCoreError.message : 'Unknown error')
          
          // Method 3: Last resort - Simple ytdl-core without enhancements
          try {
            console.log('📡 Trying simple @distube/ytdl-core (Method 3 - Last Resort)...')
            
            const info = await ytdl.getInfo(youtubeUrl)
            
            if (!info.videoDetails) {
              throw new Error('Video information not available')
            }

            const duration = parseInt(info.videoDetails.lengthSeconds || '0')
            if (duration > 1800) {
              throw new Error('Video is too long (maximum 30 minutes allowed)')
            }

            videoInfo = {
              title: info.videoDetails.title,
              duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
            }

            const audioStream = ytdl(youtubeUrl, { 
              filter: 'audioonly',
              quality: 'highestaudio'
            })

            const chunks: Buffer[] = []
            
            await new Promise<void>((resolve, reject) => {
              audioStream.on('data', (chunk: Buffer) => chunks.push(chunk))
              audioStream.on('end', () => resolve())
              audioStream.on('error', (error) => reject(error))
              
              setTimeout(() => {
                audioStream.destroy()
                reject(new Error('Simple download timeout'))
              }, 120000) // 2 minutes
            })

            audioData = Buffer.concat(chunks)
            downloadMethod = '@distube/ytdl-core (simple)'
            console.log('✅ Success with simple @distube/ytdl-core!')
            
          } catch (simpleError) {
            console.log('❌ All methods failed. Final error:', simpleError instanceof Error ? simpleError.message : 'Unknown error')
            throw new Error(`All download methods exhausted. This video may be:\n- Age-restricted or region-blocked\n- Private or deleted\n- Protected by enhanced YouTube anti-bot measures\n- Using unsupported format\n\nLast error: ${simpleError instanceof Error ? simpleError.message : 'Unknown'}`)
          }
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