'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logSessionError } from '@/lib/errorLogger'
import AuthErrorBoundary from './AuthErrorBoundary'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ToastProps {
  message: string
  type: 'error' | 'success' | 'info'
  onClose: () => void
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000) // Auto-close after 4 seconds

    return () => clearTimeout(timer)
  }, [onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-900/90 border-red-500 text-red-100'
      case 'success':
        return 'bg-green-900/90 border-green-500 text-green-100'
      case 'info':
        return 'bg-blue-900/90 border-blue-500 text-blue-100'
      default:
        return 'bg-gray-900/90 border-gray-500 text-gray-100'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right-full duration-300">
      <div className={`max-w-sm rounded-lg border p-4 shadow-lg backdrop-blur-sm ${getToastStyles()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {type === 'error' && (
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {type === 'success' && (
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, isSessionExpired, sessionError, refreshSession } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle session expiry
  useEffect(() => {
    if (mounted && isSessionExpired && sessionError) {
      // Log session expiry
      logSessionError(`Session expired for user`, {
        sessionError,
        isSessionExpired,
        userAgent: navigator.userAgent,
        url: window.location.href
      })
      
      setShowToast(true)
      // Auto-redirect after showing toast
      setTimeout(() => {
        router.push('/?session_expired=true')
      }, 3000)
    }
  }, [mounted, isSessionExpired, sessionError, router])

  // Auto-refresh session when expired
  useEffect(() => {
    if (mounted && isSessionExpired && !isRefreshing) {
      setIsRefreshing(true)
      refreshSession().then((success) => {
        if (!success) {
          // Refresh failed, redirect to login
          router.push('/?session_expired=true')
        }
        setIsRefreshing(false)
      })
    }
  }, [mounted, isSessionExpired, isRefreshing, refreshSession, router])

  // Redirect to home if not authenticated
  useEffect(() => {
    if (mounted && !loading && !user && !isSessionExpired) {
      // Check if this is a logout by checking URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const isLogout = urlParams.get('logout') === 'true'
      const isSessionExpired = urlParams.get('session_expired') === 'true'
      
      if (isLogout) {
        // This is a logout, redirect without showing toast
        router.push('/')
      } else if (isSessionExpired) {
        // This is a session expiry, redirect without showing toast
        router.push('/')
      } else {
        // This is an access attempt, show toast
        router.push('/?access_denied=true')
      }
    }
  }, [mounted, loading, user, isSessionExpired, router])

  // Show loading while checking auth or refreshing session
  if (!mounted || loading || isRefreshing) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-300">
            {isRefreshing ? 'Refreshing session...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show fallback or redirect if not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    // Show nothing while redirecting
    return null
  }

  // User is authenticated, show protected content
  return (
    <AuthErrorBoundary
      onError={(error, errorInfo) => {
        // Log boundary errors
        logSessionError(`ProtectedRoute component error: ${error.message}`, {
          componentStack: errorInfo.componentStack,
          errorStack: error.stack,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }}
    >
      {children}
      {showToast && sessionError && (
        <Toast
          message={sessionError}
          type="error"
          onClose={() => setShowToast(false)}
        />
      )}
    </AuthErrorBoundary>
  )
}
