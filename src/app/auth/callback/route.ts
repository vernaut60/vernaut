import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Auth callback route for OAuth and magic link confirmations
 * Exchanges auth code for session and sets cookies
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    try {
      // Create server-side Supabase client
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        logger.authError('Auth callback error during code exchange', {
          error: error.message,
          code: code.substring(0, 10) + '...', // Log partial code for debugging
          userAgent: request.headers.get('user-agent') || 'unknown'
        })
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }

      if (data.session) {
        // Successfully authenticated - cookies are automatically set by server client
        logger.info('Auth callback successful', {
          userId: data.session.user.id,
          redirectTo: next
        })
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      logger.authError('Auth callback exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // If no code, redirect to home with error
  logger.warn('Auth callback called without code parameter')
  return NextResponse.redirect(`${origin}/?error=auth_required`)
}
