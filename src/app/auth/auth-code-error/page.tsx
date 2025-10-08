'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthCodeError() {
  const router = useRouter()

  useEffect(() => {
    // Auto-redirect to home after 5 seconds
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">
          Authentication Error
        </h1>
        
        <p className="text-gray-300 mb-6">
          There was an error with your authentication. This could be due to:
        </p>
        
        <ul className="text-left text-gray-400 mb-6 space-y-2">
          <li>• The magic link has expired</li>
          <li>• The link has already been used</li>
          <li>• There was a network error</li>
        </ul>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <p className="text-sm text-gray-500">
            You&apos;ll be redirected automatically in 5 seconds
          </p>
        </div>
      </div>
    </div>
  )
}
