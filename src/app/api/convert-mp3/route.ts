import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'
import { createServiceRoleClient, generateMp3FileName, getStorageUrl } from '@/lib/supabase-server'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import YTDlpWrap from 'yt-dlp-wrap'

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
      


      // Server-optimized yt-dlp download (single method)
      console.log('🎵 Starting server-optimized yt-dlp audio extraction...')
      
      let audioData: Buffer | null = null
      let videoInfo: { title: string; duration: string } | null = null
      const downloadMethod = 'yt-dlp'

      const ytDlpWrap = new YTDlpWrap()
      
      // Server-optimized yt-dlp configuration for production
      const outputTemplate = path.join(tempDir, 'audio-%(id)s.%(ext)s')
      
      // Detect server environment for optimization
      const isVercel = process.env.VERCEL === '1'
      const isNetlify = process.env.NETLIFY === 'true'
      const isServerless = isVercel || isNetlify || process.env.AWS_LAMBDA_FUNCTION_NAME
      
      // Simplified, reliable yt-dlp options for production
      const ytDlpOptions = [
        youtubeUrl,
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '0', // Best quality
        '--output', outputTemplate,
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificate',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
      
      console.log('🌐 Server environment:', { isVercel, isNetlify, isServerless })
      
      console.log('🔄 Running server-optimized yt-dlp...')
      console.log('📋 Full command:', ['yt-dlp', ...ytDlpOptions].join(' '))
      console.log('🌍 Working directory:', tempDir)
      console.log('📂 Temp dir exists:', await fs.access(tempDir).then(() => true).catch(() => false))
      
      try {
        // Get yt-dlp output for debugging
        const result = await ytDlpWrap.execPromise(ytDlpOptions)
        console.log('✅ yt-dlp execution completed')
        console.log('📄 yt-dlp output:', result)
        
        // Find the downloaded file
        const files = await fs.readdir(tempDir)
        console.log('📁 Files in temp dir after yt-dlp:', files)
        console.log('📊 File count:', files.length)
        
        const downloadedFile = files.find(f => f.startsWith('audio-') && f.endsWith('.mp3'))
        
        if (!downloadedFile) {
          // Look for any MP3 file if exact match not found
          const anyMp3File = files.find(f => f.endsWith('.mp3'))
          if (anyMp3File) {
            console.log('� Using alternative MP3 file:', anyMp3File)
            audioData = await fs.readFile(path.join(tempDir, anyMp3File))
          } else {
            // Check for any audio files if MP3 not found
            const audioFiles = files.filter(f => 
              f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.ogg') || f.endsWith('.aac')
            )
            if (audioFiles.length > 0) {
              console.log('⚠️ No MP3 found, using audio file:', audioFiles[0])
              audioData = await fs.readFile(path.join(tempDir, audioFiles[0]))
            } else {
              throw new Error(`yt-dlp completed but no audio file found. Available files: ${files.join(', ')}`)
            }
          }
        } else {
          audioData = await fs.readFile(path.join(tempDir, downloadedFile))
        }
        
        videoInfo = { title: track.title || 'Unknown', duration: 'extracted' }
        console.log('✅ Success with server-optimized yt-dlp!')
        
      } catch (ytDlpError) {
        console.error('❌ yt-dlp failed with error:', ytDlpError)
        console.log('🔄 Trying fallback: download video first, then extract audio...')
        
        try {
          // Fallback: Download video first, then extract audio
          const fallbackOptions = [
            youtubeUrl,
            '--format', 'worst[height<=480]/worst',
            '--output', path.join(tempDir, 'video.%(ext)s'),
            '--no-playlist',
            '--no-warnings',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          ]
          
          console.log('📋 Fallback command:', ['yt-dlp', ...fallbackOptions].join(' '))
          const fallbackResult = await ytDlpWrap.execPromise(fallbackOptions)
          console.log('✅ Video download completed:', fallbackResult)
          
          // Check what was downloaded
          const fallbackFiles = await fs.readdir(tempDir)
          console.log('📁 Files after video download:', fallbackFiles)
          
          const videoFile = fallbackFiles.find(f => f.startsWith('video.'))
          if (!videoFile) {
            throw new Error('Video download failed - no video file created')
          }
          
          // Now extract audio from the video
          const extractOptions = [
            path.join(tempDir, videoFile),
            '--extract-audio',
            '--audio-format', 'mp3',
            '--output', path.join(tempDir, 'extracted_audio.%(ext)s')
          ]
          
          console.log('🔄 Extracting audio from video...')
          await ytDlpWrap.execPromise(extractOptions)
          
          // Check for extracted audio
          const finalFiles = await fs.readdir(tempDir)
          console.log('📁 Files after audio extraction:', finalFiles)
          
          const extractedAudio = finalFiles.find(f => f.startsWith('extracted_audio') && (f.endsWith('.mp3') || f.endsWith('.m4a')))
          if (extractedAudio) {
            audioData = await fs.readFile(path.join(tempDir, extractedAudio))
            console.log('✅ Fallback method succeeded!')
          } else {
            throw new Error('Audio extraction from video failed')
          }
          
        } catch (fallbackError) {
          console.error('❌ Fallback method also failed:', fallbackError)
          
          // Enhanced error reporting for production debugging
          const errorMessage = ytDlpError instanceof Error ? ytDlpError.message : 'Unknown error'
          
          // Common production error patterns
          if (errorMessage.includes('Sign in to confirm')) {
            throw new Error('YouTube anti-bot detection triggered. Video may require manual verification.')
          } else if (errorMessage.includes('Video unavailable')) {
            throw new Error('Video is unavailable, private, or deleted.')
          } else if (errorMessage.includes('age')) {
            throw new Error('Video is age-restricted and cannot be downloaded.')
          } else if (errorMessage.includes('region')) {
            throw new Error('Video is region-blocked and cannot be accessed from this server location.')
          } else if (errorMessage.includes('live')) {
            throw new Error('Live streams cannot be downloaded.')
          } else {
            throw new Error(`All download methods failed. Original: ${errorMessage}. Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`)
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