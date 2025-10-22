'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'

/**
 * ErrorHandler component
 * - Listens for error and success messages in URL params
 * - Displays appropriate toast messages
 * - Cleans up URL params after showing the message
 */
export default function ErrorHandler() {
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const hasShownToast = useRef(false)

  useEffect(() => {
    // Prevent showing the same toast multiple times
    if (hasShownToast.current) return

    const error = searchParams.get('error')
    const success = searchParams.get('success')

    // Error messages from middleware or server
    const errorMessages: Record<string, string> = {
      auth_required: 'Please sign in to continue.',
      session_expired: 'Your session has expired. Please sign in again.',
      access_denied: 'Access denied. Please log in to continue.',
      unauthorized: 'You are not authorized to access this resource.',
    }

    // Success messages
    const successMessages: Record<string, string> = {
      signed_out: 'You have been signed out successfully.',
      signed_in: 'Welcome back!',
    }

    if (error && errorMessages[error]) {
      hasShownToast.current = true
      addToast(errorMessages[error], 'error')
      
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.pathname + url.search)
    } else if (success && successMessages[success]) {
      hasShownToast.current = true
      addToast(successMessages[success], 'success')
      
      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.pathname + url.search)
    }

    // Reset the flag when params change
    return () => {
      hasShownToast.current = false
    }
  }, [searchParams, addToast])

  return null // This component doesn't render anything
}


