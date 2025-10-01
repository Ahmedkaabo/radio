import { NextRequest, NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'

export async function POST(request: NextRequest) {
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
      const info = await ytdl.getInfo(url)
      
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
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: String(error)
    }, { status: 500 })
  }
}