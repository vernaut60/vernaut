'use client'

import { useState, useEffect, useCallback, useContext } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAuthError, logNetworkError, logTimeoutError, logRateLimitError, logRetryError } from '@/lib/errorLogger'
import AuthErrorBoundary from './AuthErrorBoundary'
import { ToastContext } from '@/contexts/ToastContext'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
    mode?: 'unlock' | 'signin'
}


export default function LoginModal({ isOpen, onClose, mode = 'unlock' }: LoginModalProps) {
    const router = useRouter()
    const toastContext = useContext(ToastContext)
    const addToast = toastContext?.addToast
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Success messages now handled by toast notifications
    const [showEntryChoice, setShowEntryChoice] = useState(true)
    const [magicLinkSent, setMagicLinkSent] = useState(false)
    
    // Email validation states
    const [emailError, setEmailError] = useState<string | null>(null)
    const [isEmailValid, setIsEmailValid] = useState(false)
    const [emailTouched, setEmailTouched] = useState(false)
    
    // Network states
    const [isOnline, setIsOnline] = useState(true)
    const [networkError, setNetworkError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [isRetrying, setIsRetrying] = useState(false)
    
    // Timeout states (only for backend timeout detection)
    const [isTimedOut, setIsTimedOut] = useState(false)
    const [timeoutError, setTimeoutError] = useState<string | null>(null)
    
    // Rate limiting states
    const [isRateLimited, setIsRateLimited] = useState(false)
    const [rateLimitError, setRateLimitError] = useState<string | null>(null)
    const [rateLimitCooldown, setRateLimitCooldown] = useState(0)
    const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null)
    
    // Retry logic states
    const [retryAttempts, setRetryAttempts] = useState(0)
    const [maxRetries] = useState(3)
    const [isRetryingRequest, setIsRetryingRequest] = useState(false)
    const [retryDelay, setRetryDelay] = useState(1000) // Start with 1 second
    const [retryError, setRetryError] = useState<string | null>(null)

    // Network connectivity detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setNetworkError(null)
            // Auto-retry if there was a pending action
            if (retryCount > 0) {
                setIsRetrying(true)
                setTimeout(() => {
                    setIsRetrying(false)
                    setRetryCount(0)
                }, 1000)
            }
        }

        const handleOffline = () => {
            setIsOnline(false)
            setNetworkError('You appear to be offline. Please check your connection.')
        }

        // Set initial online state
        setIsOnline(navigator.onLine)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [retryCount])

    // No UI timeout - only backend timeout matters

    // Rate limiting cooldown tracking
    const [initialCooldown, setInitialCooldown] = useState(0)
    
    useEffect(() => {
        if (rateLimitCooldown <= 0) {
            if (cooldownInterval) {
                clearInterval(cooldownInterval)
                setCooldownInterval(null)
            }
            setIsRateLimited(false)
            setRateLimitError(null)
            setInitialCooldown(0)
            return
        }

        // Set initial cooldown time when cooldown starts
        if (rateLimitCooldown > 0 && initialCooldown === 0) {
            console.log('Setting initial cooldown to:', rateLimitCooldown)
            setInitialCooldown(rateLimitCooldown)
        }

        const interval = setInterval(() => {
            setRateLimitCooldown(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false)
                    setRateLimitError(null)
                    setInitialCooldown(0)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        setCooldownInterval(interval)

        return () => {
            clearInterval(interval)
        }
    }, [rateLimitCooldown, initialCooldown]) // eslint-disable-line react-hooks/exhaustive-deps

    const resetForm = useCallback(() => {
        setEmail('')
        setError(null)
        setIsLoading(false)
        setMagicLinkSent(false)
        setEmailError(null)
        setIsEmailValid(false)
        setEmailTouched(false)
        setNetworkError(null)
        setRetryCount(0)
        setIsRetrying(false)
        setIsTimedOut(false)
        setTimeoutError(null)
        setRateLimitError(null)
        setIsRateLimited(false)
        setRateLimitCooldown(0)
        setRetryAttempts(0)
        setRetryError(null)
        setIsRetryingRequest(false)
        setInitialCooldown(0)
        if (cooldownInterval) {
            clearInterval(cooldownInterval)
            setCooldownInterval(null)
        }
    }, [cooldownInterval])

    const handleClose = useCallback(() => {
        resetForm()
        onClose()
    }, [onClose, resetForm])

    // Listen for auth state changes (magic link confirmation)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only handle SIGNED_IN events when the login modal is actually open
            // This ensures we only redirect for NEW sign-ins, not session restorations
            if (event === 'SIGNED_IN' && session && isOpen) {
                console.log('[LoginModal] New sign-in detected (modal was open)')
                addToast?.('Welcome! You\'re now signed in.', 'success')
                handleClose()
                router.push('/dashboard')
            }
            
            // Log session restoration for debugging (when modal is closed)
            if (event === 'SIGNED_IN' && session && !isOpen) {
                console.log('[LoginModal] Session restored (modal was closed, staying on current page)')
            }
        })

        return () => subscription.unsubscribe()
    }, [isOpen, router, handleClose, addToast])

    // Email validation function
    const validateEmail = (email: string): { isValid: boolean; error: string | null } => {
        if (!email.trim()) {
            return { isValid: false, error: null }
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return { isValid: false, error: 'Please enter a valid email address' }
        }

        return { isValid: true, error: null }
    }

    // Handle email input changes with real-time validation
    const handleEmailChange = (value: string) => {
        setEmail(value)
        setEmailTouched(true)
        
        const validation = validateEmail(value)
        setEmailError(validation.error)
        setIsEmailValid(validation.isValid)
        
        // Clear general error when user starts typing
        if (error) {
        setError(null)
        }
    }

    // Retry logic with exponential backoff
    const shouldRetry = (error: Error): boolean => {
        // Don't retry for certain error types
        if (error?.message?.includes('rate limit') || 
            error?.message?.includes('too many') ||
            error?.message?.includes('security purposes') ||
            error?.message?.includes('only request this after') ||
            error?.message?.includes('429')) {
            return false // Don't retry rate limiting errors
        }
        
        // Don't retry email validation errors
        if (error?.message?.includes('valid email') || 
            error?.message?.includes('email address')) {
            return false
        }
        
        // Retry for network errors, timeouts, and general failures
        return true
    }

    const calculateRetryDelay = (attempt: number): number => {
        // Exponential backoff: 1s, 2s, 4s, 8s
        return Math.min(1000 * Math.pow(2, attempt), 8000)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const retryMagicLink = async (): Promise<void> => {
        if (retryAttempts >= maxRetries) {
            // Log retry exhaustion
            logRetryError(`Maximum retry attempts reached for email: ${email}`, {
                email,
                retryAttempts,
                maxRetries,
                userAgent: navigator.userAgent
            })
            
            setRetryError('Maximum retry attempts reached. Please try again later.')
            setIsRetryingRequest(false)
            return
        }

        const nextAttempt = retryAttempts + 1
        const delay = calculateRetryDelay(retryAttempts)
        
        setRetryAttempts(nextAttempt)
        setRetryDelay(delay)
        setIsRetryingRequest(true)
        setRetryError(null)

        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, delay))

        try {
            // Get the correct redirect URL for production
            const getRedirectUrl = () => {
                if (typeof window !== 'undefined') {
                    // In production, use the actual domain
                    if (process.env.NODE_ENV === 'production') {
                        return `${window.location.origin}/auth/callback?next=/dashboard`
                    }
                    // In development, use localhost
                    return `${window.location.origin}/auth/callback?next=/dashboard`
                }
                // Fallback for SSR
                return process.env.NODE_ENV === 'production'
                    ? 'https://vernaut.com/auth/callback?next=/dashboard'  // Replace with your actual domain
                    : 'http://localhost:3000/auth/callback?next=/dashboard'
            }

            const { error } = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                options: {
                    emailRedirectTo: getRedirectUrl()
                }
            })

            if (error) {
                if (shouldRetry(error)) {
                    // Retry again
                    await retryMagicLink()
                } else {
                    // Don't retry, show error
                    setError(error.message)
                    setIsRetryingRequest(false)
                }
            } else {
                // Success! Show toast instead of modal
                setMagicLinkSent(true)
                addToast?.('Magic link sent! Check your email.', 'success')
                setRetryAttempts(0)
                setIsRetryingRequest(false)
                setRetryError(null)
                
                // Toast will auto-hide, no need for timeout
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('An error occurred')
            if (shouldRetry(error)) {
                // Retry again
                await retryMagicLink()
            } else {
                // Don't retry, show error
                setError(error.message)
                setIsRetryingRequest(false)
            }
        }
    }

    const handleMagicLink = async () => {
        if (!email.trim()) {
            setError('Please enter your email address')
            return
        }

        // Check network connectivity
        if (!navigator.onLine) {
            setNetworkError('You appear to be offline. Please check your connection.')
            setRetryCount(prev => prev + 1)
            return
        }

        // Validate email before making API call
        const validation = validateEmail(email)
        if (!validation.isValid) {
            setError(validation.error || 'Please enter a valid email address')
            return
        }

        // Reset all states
        setError(null)
        setNetworkError(null)
        setTimeoutError(null)
        setIsTimedOut(false)
        setRetryAttempts(0)
        setRetryError(null)
        setIsRetrying(false)
        setIsLoading(true)

        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Request timeout'))
                }, 30000) // 30 second timeout
            })

            // Race between the actual request and timeout
            const result = await Promise.race([
                supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
                    }
                }),
                timeoutPromise
            ]) as { error: Error | null; data?: unknown }
            
            const { error } = result

            if (error) {
                // Check if it's a rate limiting error (including Supabase 429)
                if (error.message.includes('rate limit') || 
                    error.message.includes('too many') ||
                    error.message.includes('security purposes') ||
                    error.message.includes('only request this after') ||
                    error.message.includes('over_email_send_rate_limit') ||
                    error.message.includes('email rate limit exceeded') ||
                    error.message.includes('429') ||
                    error.message.includes('Too Many Requests')) {
                    
                    // Extract cooldown time from Supabase error message
                    let cooldownTime = 300 // 5 minutes fallback
                    
                    // Parse Supabase rate limit messages for time
                    const timeMatch = error.message.match(/(\d+)\s*(seconds?|minutes?|hours?|mins?|hrs?|secs?)/i)
                    if (timeMatch) {
                        const time = parseInt(timeMatch[1])
                        const unit = timeMatch[2].toLowerCase()
                        
                        if (unit.includes('hour') || unit.includes('hr')) {
                            cooldownTime = time * 3600
                        } else if (unit.includes('minute') || unit.includes('min')) {
                            cooldownTime = time * 60
                        } else {
                            cooldownTime = time // seconds
                        }
                        console.log('Parsed time from message:', cooldownTime, 'seconds')
                    } else {
                        // No time in message, use smart fallback based on error type
                        if (error.message.includes('over_email_send_rate_limit') || 
                            error.message.includes('email rate limit exceeded')) {
                            cooldownTime = 300 // 5 minutes for email rate limits
                            console.log('Email rate limit detected, using 5-minute fallback')
                        } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                            cooldownTime = 600 // 10 minutes for 429 errors
                            console.log('429 error detected, using 10-minute fallback')
                        } else {
                            cooldownTime = 300 // 5 minutes default
                            console.log('Generic rate limit, using 5-minute fallback')
                        }
                    }
                    
                    // Log rate limiting error
                    const context = {
                        email: email || 'unknown',
                        cooldownTime: cooldownTime || 30,
                        retryCount: retryCount || 0,
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                        timestamp: new Date().toISOString(),
                        errorMessage: error.message,
                        errorStatus: (error as { status?: number }).status
                    }
                    console.log('Rate limit error details:', { 
                        message: error.message, 
                        status: (error as { status?: number }).status, 
                        cooldownTime,
                        is429: error.message.includes('429') || (error as { status?: number }).status === 429,
                        parsedTime: timeMatch ? `${timeMatch[1]} ${timeMatch[2]}` : 'not parsed'
                    })
                    logRateLimitError(`Supabase rate limit (429) exceeded for email: ${email}`, context)
                    setIsRateLimited(true)
                    const timeDisplay = cooldownTime >= 60 ? `${Math.round(cooldownTime / 60)} minutes` : `${cooldownTime} seconds`
                    setRateLimitError(`Too many requests. Please wait ${timeDisplay} before trying again.`)
                    setRateLimitCooldown(cooldownTime)
                }
                // Check if it's a timeout error
                else if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
                    // Log timeout error
                    logTimeoutError(`Request timeout for email: ${email}`, {
                        email,
                        timeoutDuration: 30000,
                        userAgent: navigator.userAgent
                    })
                    
                    setTimeoutError('Request timed out. Your connection might be slow.')
                    setIsTimedOut(true)
                }
                // Check if it's a network-related error
                else if (error.message.includes('fetch') || 
                    error.message.includes('network') || 
                    error.message.includes('Failed to fetch')) {
                    
                    // Log network error
                    logNetworkError(`Network error for email: ${email}`, {
                        email,
                        errorMessage: error.message,
                        retryCount,
                        userAgent: navigator.userAgent
                    })
                    
                    setNetworkError('Network error. Please check your connection and try again.')
                    setRetryCount(prev => prev + 1)
                } else {
                    // Log general auth error
                    logAuthError(`Auth error for email: ${email}`, {
                        email,
                        errorMessage: error.message,
                        userAgent: navigator.userAgent
                    })
                    
                    setError(error.message)
                }
            } else {
                setMagicLinkSent(true)
                addToast?.('Magic link sent! Check your email.', 'success')
                setRetryCount(0) // Reset retry count on success
                
                // Toast will auto-hide, no need for timeout
            }
        } catch (err) {
            // Check if it's a timeout error
            if (err instanceof Error && err.message.includes('timeout')) {
                setTimeoutError('Request timed out. Your connection might be slow.')
                setIsTimedOut(true)
            }
            // Check if it's a network error
            else if (err instanceof TypeError && err.message.includes('fetch')) {
                setNetworkError('Network error. Please check your connection and try again.')
                setRetryCount(prev => prev + 1)
            } else {
                setError('Failed to send magic link. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github') => {
        setError(null)
        setIsLoading(true)

        try {
            // Get the correct base URL for redirects
            const baseUrl = process.env.NODE_ENV === 'production'
                ? window.location.origin
                : 'http://localhost:3000'

            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${baseUrl}/auth/callback?next=/dashboard`
                }
            })

            if (error) {
                setError(`Failed to connect with ${provider}. Please try again.`)
            }
            // If successful, user will be redirected automatically
        } catch {
            setError(`Failed to connect with ${provider}. Please try again.`)
        } finally {
            setIsLoading(false)
        }
    }





    if (!isOpen) return null

    return (
        <AuthErrorBoundary
            onError={(error, errorInfo) => {
                // Log boundary errors
                logAuthError(`Login component error: ${error.message}`, {
                    componentStack: errorInfo.componentStack,
                    errorStack: error.stack,
                    userAgent: navigator.userAgent
                })
            }}
        >
            {/* Success messages now handled by toast notifications */}

            {/* Login Modal */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative mx-auto my-auto border border-neutral-700"
                    >
                        {showEntryChoice ? (
                            <div className="flex flex-col items-center text-center p-2 max-w-sm mx-auto">
                                {/* Network Status Indicator */}
                                {!isOnline && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mb-3 w-full bg-orange-900/30 border border-orange-500 rounded-lg p-2"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                            <span className="text-orange-300 text-sm">You&apos;re offline</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Retry Indicator */}
                                {isRetrying && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mb-3 w-full bg-green-900/30 border border-green-500 rounded-lg p-2"
                                    >
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-green-300 text-sm">Connection restored! Retrying...</span>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="relative mb-2">
                                    <h2 className="text-xl font-semibold mb-1">
                                        {mode === 'signin' ? (
                                            <span className="text-white">🔐 Sign in to Vernaut</span>
                                        ) : (
                                            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(59,130,246,0.25)]">🔐 Unlock Full Insights</span>
                                        )}
                                    </h2>
                                    <div className="pointer-events-none absolute inset-x-6 -bottom-1 h-px bg-gradient-to-r from-emerald-400/50 via-cyan-400/40 to-purple-400/50"></div>
                                </div>
                                <p className="text-[12px] text-neutral-300/80 mb-3 animate-[fadeInUp_0.4s_ease-out_forwards]">
                                    {mode === 'signin' ? 'Access your saved ideas, insights, and AI roadmap.' : 'Your idea’s next step starts here 🚀'}
                                </p>
                                <p className="text-gray-400 text-sm mb-4">
                                    {mode === 'signin'
                                        ? 'Sign in to continue where you left off and sync across devices.'
                                        : 'Sign in to uncover real competitors, AI-mapped markets, and your personalized roadmap to success.'}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin('google')}
                                    disabled={isLoading}
                                    className="w-full mb-1 inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Continue with Google
                                </button>

                                <p className="text-[11px] text-gray-400 my-1">or use your email instead</p>

                                <button
                                    type="button"
                                    onClick={() => setShowEntryChoice(false)}
                                    disabled={isLoading}
                                    className="w-full mb-2 bg-transparent text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/10 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-600"
                                >
                                    Continue with Email
                                </button>

                                <p className="text-xs text-gray-500 mt-3">
                                    By continuing, you agree to our <a className="underline text-gray-300">Terms</a> and <a className="underline text-gray-300">Privacy Policy</a>.
                                </p>
                            </div>
                        ) : (
                        <div className="space-y-3">
                            {/* Header */}
                            <div className="text-center mb-1">
                                <h2 className="text-2xl font-bold text-white mb-1">Welcome to Vernaut</h2>
                                <p className="text-gray-300">Sign in to your account or create a new one</p>
                            </div>
                            {/* Magic Link Form */}
                                <>
                                    {/* Email Field */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => handleEmailChange(e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-800 text-white placeholder-gray-400 ${
                                                emailTouched && emailError 
                                                    ? 'border-red-500 bg-red-900/50' 
                                                    : emailTouched && isEmailValid 
                                                        ? 'border-green-500 bg-green-900/20' 
                                                        : error 
                                                            ? 'border-red-500 bg-red-900/50' 
                                                            : 'border-gray-600'
                                                }`}
                                            placeholder="Enter your email"
                                            disabled={isLoading}
                                        />
                                    </div>


                                    {/* Retry Error Message */}
                                    {retryError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-indigo-900/30 border border-indigo-500 rounded-lg p-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                                <p className="text-indigo-300 text-sm">{retryError}</p>
                                            </div>
                                            <p className="text-indigo-400 text-xs mt-1">
                                                Retry attempts: {retryAttempts}/{maxRetries}
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Rate Limiting Error Message */}
                                    {rateLimitError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-purple-900/30 border border-purple-500 rounded-lg p-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                                <p className="text-purple-300 text-sm">{rateLimitError}</p>
                                            </div>
                                            {rateLimitCooldown > 0 && (
                                                <div className="mt-2">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-purple-400 text-xs">Cooldown:</span>
                                                        <span className="text-purple-300 text-xs font-mono">
                                                            {rateLimitCooldown >= 60 ? `${Math.round(rateLimitCooldown / 60)}m` : `${rateLimitCooldown}s`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-purple-900/30 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                                                            style={{ 
                                                                width: `${Math.max(0, Math.min(100, 
                                                                    initialCooldown > 0 
                                                                        ? ((initialCooldown - rateLimitCooldown) / initialCooldown) * 100
                                                                        : 0
                                                                ))}%` 
                                                            }}
                                                            title={`Progress: ${Math.round(((initialCooldown - rateLimitCooldown) / initialCooldown) * 100)}% (${rateLimitCooldown}s remaining of ${initialCooldown}s)`}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* Timeout Error Message */}
                                    {timeoutError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                                <p className="text-yellow-300 text-sm">{timeoutError}</p>
                                            </div>
                                            <p className="text-yellow-400 text-xs mt-1">
                                                Try again or check your connection speed.
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Network Error Message */}
                                    {networkError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-orange-900/30 border border-orange-500 rounded-lg p-3"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                                <p className="text-orange-300 text-sm">{networkError}</p>
                                    </div>
                                            {retryCount > 0 && (
                                                <p className="text-orange-400 text-xs mt-1">
                                                    Retry attempts: {retryCount}
                                                </p>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* Email Validation Error */}
                                    {emailTouched && emailError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-red-900/30 border border-red-500 rounded-lg p-3"
                                        >
                                            <p className="text-red-400 text-sm">{emailError}</p>
                                        </motion.div>
                                    )}

                                    {/* General Error Message */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="bg-red-900/30 border border-red-500 rounded-lg p-3"
                                        >
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </motion.div>
                                    )}

                                    {/* Retry Progress Indicator */}
                                    {isRetryingRequest && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-indigo-300 text-sm">
                                                    Retrying... (Attempt {retryAttempts}/{maxRetries})
                                                </span>
                                                <span className="text-indigo-400 text-xs">
                                                    Next retry in {Math.ceil(retryDelay / 1000)}s
                                                </span>
                                            </div>
                                            <div className="w-full bg-indigo-900/30 rounded-full h-2">
                                                <div 
                                                    className="bg-indigo-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                                                    style={{ width: `${(retryAttempts / maxRetries) * 100}%` }}
                                                ></div>
                                        </div>
                                            <p className="text-indigo-400 text-xs mt-1">
                                                Using exponential backoff for better reliability
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Loading Indicator */}
                                    {/* Loading indicator removed - button has its own loading state */}

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleMagicLink}
                                            disabled={isLoading || !email.trim() || (emailTouched && !isEmailValid) || !isOnline || isTimedOut || isRateLimited || isRetryingRequest}
                                            className={`w-full font-semibold py-3 px-4 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${
                                                !isOnline 
                                                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                                                    : isRetryingRequest
                                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                        : isRateLimited
                                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                            : isTimedOut
                                                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                    Sending Magic Link...
                                                </div>
                                            ) : !isOnline ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin mr-2"></div>
                                                    Offline - Check Connection
                                                </div>
                                            ) : isRetryingRequest ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mr-2"></div>
                                                    Retrying... ({retryAttempts}/{maxRetries})
                                                </div>
                                            ) : isRateLimited ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mr-2"></div>
                                                    Wait {rateLimitCooldown >= 60 ? `${Math.round(rateLimitCooldown / 60)}m` : `${rateLimitCooldown}s`}
                                                </div>
                                            ) : isTimedOut ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mr-2"></div>
                                                    Try Again
                                                </div>
                                            ) : magicLinkSent ? (
                                                'Magic Link Sent!'
                                            ) : (
                                                'Send Magic Link'
                                            )}
                                        </button>

                                    </div>

                                </>
                        </div>
                        )}

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => (isLoading ? null : (showEntryChoice ? handleClose() : setShowEntryChoice(true)))}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AuthErrorBoundary>
    )
}