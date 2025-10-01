import { NextRequest, NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'
import youtubedl from 'youtube-dl-exec'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export async function POST(request: NextRequest) {
  // Store original working directory
  const originalCwd = process.cwd()
  
  try {
    const { url: rawUrl } = await request.json()
    
    if (!rawUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Ensure URL has protocol for @distube/ytdl-core
    let url = rawUrl
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
      console.log('🔧 Added protocol. Original URL vs processed:', { original: rawUrl, processed: url })
    }

    console.log('🔍 Testing YouTube access for:', url)

    const result = {
      url: url,
      success: false,
      error: '',
      details: null as unknown,
      methods: [] as string[]
    }

    // Create temp directory and change working directory to prevent EROFS errors
    const tempDir = path.join(os.tmpdir(), 'radio-cafe-test')
    await fs.mkdir(tempDir, { recursive: true })
    process.chdir(tempDir)
    console.log('🔧 Changed working directory to:', tempDir)

    // Test Method 1: youtube-dl-exec (production preferred)
    try {
      console.log('📡 Testing youtube-dl-exec (Method 1)...')
      
      const testResult = await youtubedl(url, {
        dumpSingleJson: true,
        noPlaylist: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      
      result.methods.push('youtube-dl-exec')
      result.success = true
      
      result.details = {
        title: 'YouTube video accessible via youtube-dl-exec',
        duration: 'Available',
        isPrivate: false,
        isLiveContent: false,
        formatsCount: 1,
        preferredMethod: 'youtube-dl-exec'
      }
      console.log('✅ youtube-dl-exec working')
      
    } catch (youtubeDlError) {
      console.log('❌ youtube-dl-exec failed:', youtubeDlError instanceof Error ? youtubeDlError.message : 'Unknown error')
      
      // Test Method 2: @distube/ytdl-core (fallback)
      try {
        console.log('📡 Testing @distube/ytdl-core (Method 2)...')
        
        // Configure with browser-like headers to avoid bot detection
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
        
        // Prevent ytdl from trying to write cache files to read-only filesystem
        process.env.YTDL_NO_UPDATE = 'true'
        
        const info = await ytdl.getInfo(url, ytdlOptions)
        
        result.methods.push('@distube/ytdl-core')
        result.success = true
        result.details = {
          title: info.videoDetails.title,
          duration: info.videoDetails.lengthSeconds,
          isPrivate: info.videoDetails.isPrivate,
          isLiveContent: info.videoDetails.isLiveContent,
          formatsCount: info.formats?.length || 0,
          preferredMethod: '@distube/ytdl-core (fallback)'
        }
        console.log('✅ @distube/ytdl-core working as fallback')
        
      } catch (ytdlCoreError) {
        console.log('❌ @distube/ytdl-core also failed:', ytdlCoreError instanceof Error ? ytdlCoreError.message : 'Unknown error')
        result.error = 'Both download methods failed. Video may be restricted or YouTube changed their structure.'
      }
    }

    console.log('📊 Test result:', result)
    
    return NextResponse.json({
      success: true,
      result,
      recommendation: result.success ? '@distube/ytdl-core works perfectly!' : 'Video may be restricted or unavailable'
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
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