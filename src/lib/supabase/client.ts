import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Client-side Supabase client for browser/React components
 * 
 * Per Supabase docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 * Uses @supabase/ssr createBrowserClient for proper SSR cookie handling
 */

// Singleton to prevent multiple client instances
let client: SupabaseClient | null = null

export function createClient() {
  // Return existing client if already created
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  // Create client following Supabase SSR pattern
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  return client
}

