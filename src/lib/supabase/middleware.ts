import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Middleware Supabase client
 * - Refreshes expired auth tokens
 * - Updates session cookies
 * - Use only in middleware.ts
 */
export async function createClient(request: NextRequest) {
  // eslint-disable-next-line prefer-const
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Note: supabaseResponse appears unused but is mutated by Supabase client's setAll() callback

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, supabaseResponse, user }
}

