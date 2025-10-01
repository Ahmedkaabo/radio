import { NextRequest, NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'
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
      details: null as unknown
    }

    // Test @distube/ytdl-core
    try {
      console.log('📡 Testing @distube/ytdl-core...')
      
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

      // Create temp directory and change working directory to prevent EROFS errors
      const tempDir = path.join(os.tmpdir(), 'radio-cafe-test')
      await fs.mkdir(tempDir, { recursive: true })
      process.chdir(tempDir)
      console.log('🔧 Changed working directory to:', tempDir)
      
      // Prevent ytdl from trying to write cache files to read-only filesystem
      process.env.YTDL_NO_UPDATE = 'true'
      
      const info = await ytdl.getInfo(url, ytdlOptions)
      
      result.success = true
      result.details = {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        isPrivate: info.videoDetails.isPrivate,
        isLiveContent: info.videoDetails.isLiveContent,
        formatsCount: info.formats?.length || 0
      }
      
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string }
      result.error = `Status: ${err.statusCode || 'unknown'}, Message: ${err.message || 'unknown'}`
      console.error('❌ @distube/ytdl-core failed:', err)
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