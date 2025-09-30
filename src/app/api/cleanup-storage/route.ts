import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json()
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name required' }, { status: 400 })
    }

    const storageClient = createServiceRoleClient()
    
    // Delete file from storage
    const { error } = await storageClient.storage
      .from('mp3-files')
      .remove([fileName])

    if (error) {
      console.error('Storage deletion error:', error)
      return NextResponse.json({ 
        error: 'Failed to delete file from storage',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    })

  } catch (error) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}