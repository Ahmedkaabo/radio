import { NextRequest, NextResponse } from 'next/server'
import ytdl from 'ytdl-core'
import youtubedl from 'youtube-dl-exec'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    console.log('🔍 Testing YouTube access for:', url)
    
    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }
    if (normalizedUrl.includes('youtu.be/')) {
      const videoId = normalizedUrl.split('youtu.be/')[1].split('?')[0]
      normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    const results = {
      url: normalizedUrl,
      ytdlCore: { success: false, error: '', details: null as unknown },
      youtubeDlExec: { success: false, error: '', details: null as unknown }
    }

    // Test ytdl-core
    try {
      console.log('📡 Testing ytdl-core...')
      const info = await ytdl.getInfo(normalizedUrl, {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        }
      })
      
      results.ytdlCore.success = true
      results.ytdlCore.details = {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        isPrivate: info.videoDetails.isPrivate,
        isLiveContent: info.videoDetails.isLiveContent,
        formatsCount: info.formats?.length || 0
      }
      
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string }
      results.ytdlCore.error = `Status: ${err.statusCode || 'unknown'}, Message: ${err.message || 'unknown'}`
      console.error('❌ ytdl-core failed:', err)
    }

    // Test youtube-dl-exec
    try {
      console.log('📡 Testing youtube-dl-exec...')
      const info = await youtubedl(normalizedUrl, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        addHeader: [
          'referer:youtube.com',
          'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      })
      
      results.youtubeDlExec.success = true
      const dlInfo = info as { title?: string; duration?: number; formats?: unknown[] }
      results.youtubeDlExec.details = {
        title: dlInfo.title || 'Unknown',
        duration: dlInfo.duration || 0,
        formats: dlInfo.formats?.length || 0
      }
      
    } catch (error: unknown) {
      results.youtubeDlExec.error = String(error)
      console.error('❌ youtube-dl-exec failed:', error)
    }

    console.log('📊 Test results:', results)
    
    return NextResponse.json({
      success: true,
      results,
      recommendation: results.ytdlCore.success ? 'ytdl-core works' : 
                     results.youtubeDlExec.success ? 'Use youtube-dl-exec' : 
                     'Both methods failed - video may be restricted'
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: String(error)
    }, { status: 500 })
  }
}