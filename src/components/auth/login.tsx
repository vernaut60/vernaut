'use client'

import { useState } from 'react'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

interface LoginResponse {
    success: boolean
    message?: string
    error?: string
    user?: {
        id: string
        email: string
    }
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showSocialOptions, setShowSocialOptions] = useState(false)

    const resetForm = () => {
        setEmail('')
        setPassword('')
        setError(null)
        setIsLoading(false)
        setShowSocialOptions(false)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async (action: 'login' | 'signup') => {
        setError(null)
        setIsLoading(true)

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    action,
                }),
            })

            const data: LoginResponse = await response.json()

            if (data.success) {
                setSuccessMessage(data.message || 'Login successful')
                handleClose()
                setShowSuccess(true)

                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    setShowSuccess(false)
                    setSuccessMessage('')
                }, 3000)
            } else {
                setError(data.error || 'Something went wrong')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            setError('Please enter your email address first')
            return
        }

        setError(null)
        setIsLoading(true)

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    action: 'forgot-password',
                }),
            })

            const data: LoginResponse = await response.json()

            if (data.success) {
                setSuccessMessage(data.message || 'Password reset email sent!')
                handleClose()
                setShowSuccess(true)

                // Auto-hide success message after 5 seconds for forgot password
                setTimeout(() => {
                    setShowSuccess(false)
                    setSuccessMessage('')
                }, 5000)
            } else {
                setError(data.error || 'Failed to send reset email')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'github') => {
        setError(null)
        setIsLoading(true)

        try {
            // For now, we'll show a success message
            // In a real implementation, you'd integrate with Supabase social auth
            setSuccessMessage(`Redirecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`)
            handleClose()
            setShowSuccess(true)

            setTimeout(() => {
                setShowSuccess(false)
                setSuccessMessage('')
            }, 3000)
        } catch {
            setError(`Failed to connect with ${provider}. Please try again.`)
        } finally {
            setIsLoading(false)
        }
    }



    if (!isOpen && !showSuccess) return null

    return (
        <>
            {/* Success Alert - Big green box in center */}
            {showSuccess && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 w-full max-w-md shadow-2xl relative mx-auto my-auto">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-green-800 mb-2">
                                {successMessage.includes('reset') ? 'Email Sent!' : 'Login Successful!'}
                            </h3>
                            <p className="text-green-700 text-lg">
                                {successMessage}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Modal */}
            {isOpen && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-black rounded-2xl p-8 w-full max-w-md shadow-2xl relative mx-auto my-auto border border-gray-700">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Vernaut</h2>
                            <p className="text-gray-300">Sign in to your account or create a new one</p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Social Options - Show when user clicks Sign Up */}
                            {showSocialOptions && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-gray-300 text-sm mb-4">Choose how you&apos;d like to sign up:</p>
                                    </div>

                                    {/* Social Login Buttons */}
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => handleSocialLogin('google')}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Continue with Google
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSocialLogin('facebook')}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#166FE5] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                            Continue with Facebook
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleSocialLogin('github')}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-700"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            Continue with GitHub
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-600"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-2 bg-black text-gray-400">Or continue with email</span>
                                        </div>
                                    </div>

                                    {/* Email Signup Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowSocialOptions(false)}
                                        disabled={isLoading}
                                        className="w-full bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-600"
                                    >
                                        Sign Up with Email
                                    </button>

                                    {/* Back Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowSocialOptions(false)}
                                        className="w-full text-gray-400 hover:text-white text-sm underline"
                                    >
                                        ← Back to login
                                    </button>
                                </div>
                            )}

                            {/* Regular Login/Signup Form - Hide when social options are shown */}
                            {!showSocialOptions && (
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
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-800 text-white placeholder-gray-400 ${error ? 'border-red-500 bg-red-900/50' : 'border-gray-600'
                                                }`}
                                            placeholder="Enter your email"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    {/* Password Field */}
                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-800 text-white placeholder-gray-400 ${error ? 'border-red-500 bg-red-900/50' : 'border-gray-600'
                                                }`}
                                            placeholder="Enter your password"
                                            disabled={isLoading}
                                        />
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-900/30 border border-red-500 rounded-lg p-3">
                                            <p className="text-red-400 text-sm">{error}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSubmit('login')}
                                            disabled={isLoading || !email.trim() || !password.trim()}
                                            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isLoading ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                    Processing...
                                                </div>
                                            ) : (
                                                'Login'
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowSocialOptions(true)}
                                            disabled={isLoading}
                                            className="w-full bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-600"
                                        >
                                            Sign Up
                                        </button>
                                    </div>

                                    {/* Forgot Password Link */}
                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={handleForgotPassword}
                                            disabled={isLoading}
                                            className="text-sm text-blue-400 hover:text-blue-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

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
                    </div>
                </div>
            )}
        </>
    )
}