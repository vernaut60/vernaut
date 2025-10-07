'use client'

import { useEffect, useState } from 'react'
import LoginModal from './auth/login'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [loginMode, setLoginMode] = useState<'unlock' | 'signin'>('signin')

  // Listen for global event to open login from anywhere (e.g., Unlock Insights button)
  useEffect(() => {
    const handler = () => {
      setLoginMode('unlock')
      setIsLoginModalOpen(true)
    }
    window.addEventListener('open-login-modal', handler as EventListener)
    return () => window.removeEventListener('open-login-modal', handler as EventListener)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-neutral-800">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand Name - Left */}
          <div className="flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Vernaut
            </h1>
          </div>

          {/* Desktop Navigation - Right */}
          <div className="hidden sm:flex items-center space-x-4">
            <button
              type="button"
              onClick={() => { setLoginMode('signin'); setIsLoginModalOpen(true) }}
              className="inline-flex items-center justify-center rounded-lg text-white font-medium px-4 py-2 text-sm border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 transition-all duration-150 active:scale-95"
            >
              Log In
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-white hover:bg-neutral-800 transition-colors duration-150"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="sm:hidden border-t border-neutral-800 py-4">
            <div className="flex flex-col space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false)
                  setLoginMode('signin')
                  setIsLoginModalOpen(true)
                }}
                className="inline-flex items-center justify-center rounded-lg text-white font-medium px-4 py-3 text-sm border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 transition-all duration-150 active:scale-95"
              >
                Log In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        mode={loginMode}
      />
    </header>
  )
}
