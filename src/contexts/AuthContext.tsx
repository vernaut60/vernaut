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

  // Session validation function (checks expiry only - getUser() handles server validation)
  const validateSession = (session: Session | null): boolean => {
    if (!session) {
      return false
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at
    
    if (expiresAt && now >= expiresAt) {
      // Session expired
      return false
    }
    
    // Session is valid
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
        window.dispatchEvent(new CustomEvent('handoff-complete', {
          detail: {
            ideas_transferred: result.ideas_transferred || 0,
            limit_reached: result.limit_reached || false
          }
        }))
      } else {
        console.log('ℹ️ Handoff skipped:', result.message)
        // Still clear the session ID to avoid repeated attempts
        localStorage.removeItem('guest-session-id')
        // Clean up any legacy session IDs
        localStorage.removeItem('vernaut-guest-session-id')
        // Emit event even if no transfer (handoff process completed)
        window.dispatchEvent(new CustomEvent('handoff-complete', {
          detail: {
            ideas_transferred: 0,
            limit_reached: false
          }
        }))
      }
    } catch (error) {
      console.error('❌ Error during guest idea handoff:', error)
      // Don't clear the session ID on error, allow retry
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Get initial user (validates with server - Supabase recommended pattern)
    const getInitialUser = async () => {
      try {
        console.log('[AuthContext] Getting initial user (validating with server)...')
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('[AuthContext] User loading timeout after 5s, assuming no session')
          setSession(null)
          setUser(null)
          setLoading(false)
        }, 5000) // 5 second timeout (getUser makes network request)
        
        // First check if session exists (fast check from localStorage)
        // This prevents calling getUser() when there's no session (which throws error)
        const { data: { session: localSession } } = await supabase.auth.getSession()
        
        if (!localSession) {
          // No session in localStorage - user is definitely not logged in
          console.log('[AuthContext] No session found in localStorage')
          clearTimeout(timeoutId)
          setSession(null)
          setUser(null)
          setIsSessionExpired(false)
          setSessionError(null)
          setLoading(false)
          return
        }
        
        // Session exists - validate with server using getUser() (Supabase recommendation)
        // This ensures the session is still valid on the server
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        
        // Clear timeout if we get a response
        clearTimeout(timeoutId)
        
        if (error) {
          // Error from getUser() - session invalid/expired on server
          console.error('[AuthContext] Error validating user with server:', error)
          setSession(null)
          setUser(null)
          setIsSessionExpired(true)
          setSessionError('Your session is invalid. Please sign in again.')
          setLoading(false)
          return
        }
        
        if (authUser) {
          // User is valid - use the session we already have
          console.log('[AuthContext] User validated with server:', authUser.email)
          setUser(authUser)
          setSession(localSession) // Use the session we already fetched
          setIsSessionExpired(false)
          setSessionError(null)
        } else {
          // No user returned - clear state
          console.log('[AuthContext] No authenticated user')
          setSession(null)
          setUser(null)
          setIsSessionExpired(false)
          setSessionError(null)
        }
        
        setLoading(false)
      } catch (error) {
        // Handle any unexpected errors (like network failures)
        console.error('[AuthContext] Exception getting user:', error)
        clearTimeout(timeoutId)
        
        // If it's an "Auth session missing" error, that's fine - just means no session
        if (error instanceof Error && error.message.includes('Auth session missing')) {
          console.log('[AuthContext] No session found (expected for logged out users)')
          setSession(null)
          setUser(null)
          setIsSessionExpired(false)
          setSessionError(null)
        } else {
          // Other errors - clear state to be safe
          setSession(null)
          setUser(null)
        }
        
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes (Supabase recommended pattern)
    // onAuthStateChange provides validated sessions from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event)
        
        // onAuthStateChange provides validated sessions, but check expiry for safety
        if (session) {
          const isValid = validateSession(session)
          
          if (isValid) {
            setSession(session)
            setUser(session.user)
            setIsSessionExpired(false)
            setSessionError(null)
            
            // Handle automatic guest idea handoff on sign-in
            if (event === 'SIGNED_IN') {
              await handleGuestIdeaHandoff(session)
            }
          } else {
            // Session expired - clear state
            setSession(null)
            setUser(null)
            setIsSessionExpired(true)
            setSessionError('Your session has expired. Please sign in again.')
          }
        } else {
          // No session - clear state
          setSession(null)
          setUser(null)
          setIsSessionExpired(false)
          setSessionError(null)
        }
        
        setLoading(false)
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

