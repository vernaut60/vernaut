'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<boolean>
  isSessionExpired: boolean
  sessionError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Create Supabase client only once, inside React component lifecycle
  const supabase = useMemo(() => {
    console.log('[AuthContext] Creating Supabase client...')
    return createClient()
  }, [])

  // Session validation function
  const validateSession = (session: Session | null): boolean => {
    if (!session) return false
    
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at
    
    if (expiresAt && now >= expiresAt) {
      setIsSessionExpired(true)
      setSessionError('Your session has expired. Please sign in again.')
      return false
    }
    
    setIsSessionExpired(false)
    setSessionError(null)
    return true
  }

  // Refresh session function
  const refreshSession = async (): Promise<boolean> => {
    try {
      setLoading(true)
      setSessionError(null)
      
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        setSessionError('Failed to refresh session. Please sign in again.')
        setIsSessionExpired(true)
        // Ensure UI reflects logged-out state immediately on failure
        setUser(null)
        setSession(null)
        return false
      }
      
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setIsSessionExpired(false)
        setSessionError(null)
        return true
      }
      
      // No session returned - treat as logged out
      setUser(null)
      setSession(null)
      return false
    } catch (error) {
      console.error('Session refresh error:', error)
      setSessionError('Failed to refresh session. Please sign in again.')
      setIsSessionExpired(true)
      // Ensure UI reflects logged-out state on exceptions as well
      setUser(null)
      setSession(null)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Handle automatic guest idea handoff
  const handleGuestIdeaHandoff = async (session: Session) => {
    try {
      // Check if we have a guest session ID in localStorage
      const guestSessionId = localStorage.getItem('guest-session-id')
      
      if (!guestSessionId) {
        console.log('🔄 No guest session found, skipping handoff')
        return
      }
      
      console.log('🔄 Attempting to transfer guest ideas for session:', guestSessionId)
      
      // Call the handoff API
      const response = await fetch('/api/demo/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ guest_session_id: guestSessionId }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Successfully transferred guest ideas:', result.ideas_transferred)
        // Clear the guest session ID after successful transfer
        localStorage.removeItem('guest-session-id')
        // Clean up any legacy session IDs
        localStorage.removeItem('vernaut-guest-session-id')
        // Emit event to notify dashboard that handoff completed
        window.dispatchEvent(new CustomEvent('handoff-complete'))
      } else {
        console.log('ℹ️ Handoff skipped:', result.message)
        // Still clear the session ID to avoid repeated attempts
        localStorage.removeItem('guest-session-id')
        // Clean up any legacy session IDs
        localStorage.removeItem('vernaut-guest-session-id')
        // Emit event even if no transfer (handoff process completed)
        window.dispatchEvent(new CustomEvent('handoff-complete'))
      }
    } catch (error) {
      console.error('❌ Error during guest idea handoff:', error)
      // Don't clear the session ID on error, allow retry
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[AuthContext] Getting initial session...')
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('[AuthContext] Session loading timeout after 3s, assuming no session')
          setSession(null)
          setUser(null)
          setLoading(false)
        }, 3000) // 3 second timeout
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Clear timeout if we get a response
        clearTimeout(timeoutId)
        
        if (error) {
          console.error('[AuthContext] Error getting session:', error)
          setLoading(false)
          return
        }
        
        console.log('[AuthContext] Session loaded:', session ? 'authenticated' : 'no session')
        setSession(session)
        setUser(session?.user ?? null)
        validateSession(session)
        setLoading(false)
      } catch (error) {
        console.error('[AuthContext] Exception getting session:', error)
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event)
        setSession(session)
        setUser(session?.user ?? null)
        validateSession(session)
        setLoading(false)
        
        // Handle automatic guest idea handoff on sign-in
        if (event === 'SIGNED_IN' && session?.user) {
          await handleGuestIdeaHandoff(session)
        }
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Note: Session auto-refresh is now handled by Supabase client (autoRefreshToken: true)
  // The periodic validation above is no longer needed, but kept for backwards compatibility

  const signOut = async () => {
    try {
      setLoading(true)
      setSessionError(null)
      setIsSessionExpired(false)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        // Still clear local state even if server logout fails
      }
      
      setUser(null)
      setSession(null)
      setIsSessionExpired(false)
      setSessionError(null)
      
      // Redirect to home with logout flag
      window.location.href = '/?logout=true'
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local state even if logout fails
      setUser(null)
      setSession(null)
      setIsSessionExpired(false)
      setSessionError(null)
      // Redirect to home with logout flag
      window.location.href = '/?logout=true'
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
    isSessionExpired,
    sessionError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
