import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The setAll method was called from a Server Component.
        }
      },
    },
  })
}

// Server-side Supabase client with service role key for file operations
export function createServiceRoleClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for service role client')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to generate unique file names
export function generateMp3FileName(track: { title: string; artist: string; id: string }): string {
  const safeTitle = track.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
  const safeArtist = track.artist.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const timestamp = Date.now()
  const shortId = track.id.slice(0, 8)
  
  return `${safeArtist}_${safeTitle}_${shortId}_${timestamp}.mp3`
}

// Helper function to get public URL from Supabase Storage
export function getStorageUrl(fileName: string): string {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  
  return `${supabaseUrl}/storage/v1/object/public/mp3-files/${fileName}`
}