import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

/**
 * Middleware runs on every request before the page loads
 * - Refreshes auth tokens automatically
 * - Protects routes that require authentication
 * - Redirects to landing page if not authenticated
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await createClient(request)

  const path = request.nextUrl.pathname

  console.log('[Middleware]', { path, hasUser: !!user })

  // Define protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/ideas']
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))

  // Define public routes that should redirect authenticated users
  const publicRoutes = ['/']
  const isPublicRoute = publicRoutes.includes(path)

  // If trying to access protected route without authentication
  if (isProtectedRoute && !user) {
    console.log('[Middleware] 🚫 Protected route without auth, redirecting to /', { path })
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'auth_required')
    return NextResponse.redirect(url)
  }

  // If authenticated user tries to access landing page, redirect to dashboard
  if (isPublicRoute && user && path === '/') {
    // Check if there are any query params we should preserve (like logout, etc.)
    const hasLogoutParam = request.nextUrl.searchParams.has('logout')
    const hasErrorParam = request.nextUrl.searchParams.has('error')
    
    // Don't redirect if user is explicitly logging out or there's an error message
    if (!hasLogoutParam && !hasErrorParam) {
      console.log('[Middleware] ✅ Authenticated on landing, redirecting to /dashboard')
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = '' // Clear any query params
      return NextResponse.redirect(url)
    }
  }

  console.log('[Middleware] ✅ Passing through', { path })
  // Return response with updated cookies
  return supabaseResponse
}

/**
 * Configure which routes the middleware should run on
 * Excludes:
 * - API routes
 * - Auth callback routes
 * - Static files
 * - Next.js internals
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - auth (auth callback routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|auth|_next/static|_next/image|favicon.ico).*)',
  ],
}

