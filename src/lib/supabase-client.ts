import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your_supabase')) {
    throw new Error('Supabase not configured')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}