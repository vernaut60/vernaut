'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
        return false
      }
      
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setIsSessionExpired(false)
        setSessionError(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Session refresh error:', error)
      setSessionError('Failed to refresh session. Please sign in again.')
      setIsSessionExpired(true)
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      validateSession(session)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        validateSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Periodic session validation
  useEffect(() => {
    if (!session) return

    const validateInterval = setInterval(() => {
      if (session && !validateSession(session)) {
        // Try to refresh the session automatically
        refreshSession()
      }
    }, 60000) // Check every minute

    return () => clearInterval(validateInterval)
  }, [session])

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
