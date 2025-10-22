'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface DashboardPageProps {
  onNewIdea?: () => void
}

interface Idea {
  id: string
  idea_text: string
  title: string
  score: number | null
  risk_score: number | null
  risk_level: string | null
  created_at: string
}

interface IdeasResponse {
  success: boolean
  ideas: Idea[]
  meta: {
    total: number
    limit: number
    offset: number
    remaining: number
  }
}

export default function DashboardPage({ onNewIdea }: DashboardPageProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  // Extract username from email
  const getUserDisplayName = (email: string): string => {
    try {
      const username = email.split('@')[0]
      // Remove numbers and special characters, keep only letters
      const cleanName = username.replace(/[^a-zA-Z]/g, '')
      
      // If no letters found, use fallback
      if (cleanName.length === 0) {
        return 'Creator'
      }
      
      // Capitalize first letter
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase()
    } catch (error) {
      console.error('Error extracting username:', error)
      return 'Creator'
    }
  }

  // Fetch user's ideas
  const fetchUserIdeas = async () => {
    console.log('🔍 fetchUserIdeas called at:', new Date().toISOString(), 'Stack trace:', new Error().stack)
    try {
      setIdeasLoading(true)
      setIdeasError(null)
      
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch('/api/ideas?limit=5', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch ideas')
      }

      const data: IdeasResponse = await response.json()
      
      if (data.success) {
        setIdeas(data.ideas)
        console.log(`Loaded ${data.ideas.length} ideas for user`)
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Error fetching user ideas:', error)
      setIdeasError(error instanceof Error ? error.message : 'Failed to load ideas')
    } finally {
      setIdeasLoading(false)
    }
  }

  // Get user email and ideas on component mount
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const getUserEmail = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          const name = getUserDisplayName(user.email)
          setDisplayName(name)
        } else {
          setDisplayName('Creator')
        }
      } catch (error) {
        console.error('Error getting user email:', error)
        setDisplayName('Creator')
      } finally {
        setIsLoading(false)
      }
    }

    const initializeDashboard = async () => {
      console.log('🚀 initializeDashboard called')
      await getUserEmail()
      
      // Check if handoff is in progress by looking for guest session ID
      const hasGuestSession = localStorage.getItem('guest-session-id')
      console.log('🔍 hasGuestSession:', hasGuestSession)
      
      if (hasGuestSession) {
        // Handoff is in progress, wait for it to complete
        console.log('🔄 Handoff in progress, waiting for completion...')
        
        // Set up timeout protection (30 seconds max wait)
        const timeoutId = setTimeout(() => {
          console.log('⏰ Handoff timeout, fetching ideas anyway...')
          fetchUserIdeas()
        }, 30000)
        
        const handleHandoffComplete = () => {
          console.log('✅ Handoff completed, fetching ideas...')
          clearTimeout(timeoutId) // Clear timeout since handoff completed
          fetchUserIdeas()
        }
        
        // Listen for handoff completion event
        window.addEventListener('handoff-complete', handleHandoffComplete)
        
        // Return cleanup function
        return () => {
          clearTimeout(timeoutId)
          window.removeEventListener('handoff-complete', handleHandoffComplete)
        }
      } else {
        // No handoff in progress, fetch ideas immediately
        console.log('📊 No handoff in progress, fetching ideas immediately...')
        await fetchUserIdeas()
        // Return empty cleanup function for consistency
        return () => {}
      }
    }

    // Handle cleanup properly
    let cleanupFn: (() => void) | undefined
    
    initializeDashboard().then(cleanup => {
      cleanupFn = cleanup
    })
    
    return () => {
      cleanupFn?.()
    }
  }, [])

  const handleNewIdea = () => {
    onNewIdea?.()
    console.log('Creating new idea...')
  }

  return (
    <main className="min-h-screen w-full bg-black text-white">
        {/* Background graphics similar to landing page */}
        <div className="absolute inset-0">
          {/* Faint gradient overlay at the top */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 via-transparent to-transparent"></div>
          
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-3"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          ></div>
          
          {/* Floating idea sparks - subtle and continuous */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top section sparks */}
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400/60 rounded-full animate-[ideaSpark_6s_ease-out_infinite]"
              style={{ 
                left: '15%', 
                top: '15%',
                animationDelay: '0s'
              }}
            ></div>
            <div 
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400/60 rounded-full animate-[ideaSpark_8s_ease-out_infinite]"
              style={{ 
                left: '85%', 
                top: '20%',
                animationDelay: '2s'
              }}
            ></div>
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-cyan-400/60 rounded-full animate-[ideaSpark_7s_ease-out_infinite]"
              style={{ 
                left: '60%', 
                top: '10%',
                animationDelay: '4s'
              }}
            ></div>
            
            {/* Middle section sparks */}
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-indigo-400/50 rounded-full animate-[ideaSpark_9s_ease-out_infinite]"
              style={{ 
                left: '25%', 
                top: '40%',
                animationDelay: '1s'
              }}
            ></div>
            <div 
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-pink-400/50 rounded-full animate-[ideaSpark_7.5s_ease-out_infinite]"
              style={{ 
                left: '75%', 
                top: '35%',
                animationDelay: '3s'
              }}
            ></div>
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-400/50 rounded-full animate-[ideaSpark_8.5s_ease-out_infinite]"
              style={{ 
                left: '45%', 
                top: '50%',
                animationDelay: '1.5s'
              }}
            ></div>
            
            {/* Bottom section sparks */}
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-amber-400/50 rounded-full animate-[ideaSpark_6.5s_ease-out_infinite]"
              style={{ 
                left: '20%', 
                top: '80%',
                animationDelay: '0.5s'
              }}
            ></div>
            <div 
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-violet-400/50 rounded-full animate-[ideaSpark_9.5s_ease-out_infinite]"
              style={{ 
                left: '70%', 
                top: '85%',
                animationDelay: '2.5s'
              }}
            ></div>
            <div 
              className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-teal-400/50 rounded-full animate-[ideaSpark_7s_ease-out_infinite]"
              style={{ 
                left: '90%', 
                top: '75%',
                animationDelay: '3.5s'
              }}
            ></div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-6 sm:pt-12 sm:pb-8 lg:pt-16 lg:pb-12">
          {/* Welcome Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full pt-6 sm:pt-8 lg:pt-12 pb-0"
          >
            {/* Welcome Message + Top-right CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="mb-6 sm:mb-8 lg:mb-10"
            >
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-6 sm:h-8 lg:h-10 bg-neutral-700 rounded w-48 sm:w-64 lg:w-80 mb-2 sm:mb-3"></div>
                  <div className="h-4 sm:h-6 lg:h-8 bg-neutral-700 rounded w-56 sm:w-80 lg:w-96 mb-4 sm:mb-6"></div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3"
                      >
                        Welcome back, <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                          className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-semibold"
                        >
                          {displayName}
                        </motion.span> 
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: 0.5 }}
                          className="inline-block ml-2"
                        >
                          ✨
                        </motion.span>
                      </motion.h1>
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
                        className="text-gray-400 text-sm sm:text-base"
                      >
                        Your recent ideas are below.
                      </motion.p>
                      {/* Early Access badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.65, ease: 'easeOut' }}
                        className="mt-2"
                      >
                        <span className="inline-flex items-center bg-white/5 px-2 py-1 text-xs text-gray-400 rounded-full border border-white/10">
                          Early Access ✨
                        </span>
                      </motion.div>
                    </div>
                    {/* Top-right New Idea button (keeps existing iconography/animations) */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.35 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNewIdea}
                      className="inline-flex items-center justify-center self-start sm:self-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-300 shadow-lg relative overflow-hidden group"
                    >
                      <motion.div 
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        style={{ backgroundSize: '200% 200%' }}
                      />
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <span className="mr-2 relative z-10">+</span>
                      <span className="relative z-10">New Idea</span>
                    </motion.button>
                  </div>

                  {/* Quiet usage line under header */}
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
                    className="mt-1 text-xs sm:text-[13px] text-gray-500"
                  >
                    You can create up to <span className="text-indigo-300">5 ideas</span> — more soon!
                  </motion.p>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Ideas Grid Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="mt-2 sm:mt-3 lg:mt-4"
          >
            <div className="relative">
              {/* pronounced outer glow */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-60" style={{ boxShadow: '0 0 120px rgba(99,102,241,0.45)' }} aria-hidden="true"></div>
              <div className="relative rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-b from-[#0a0a0f] to-[#0d0d14] backdrop-blur-md shadow-inner p-6 sm:p-8 lg:p-10">
                {/* inner radial glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-70" 
                  style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12), transparent 60%)' }} 
                  aria-hidden="true"></div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6 text-white">Your Ideas</h2>
              
              {ideasLoading ? (
                <div className="text-center py-8 sm:py-12 lg:py-16">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                    <span className="text-neutral-300">Loading your ideas...</span>
                  </div>
                </div>
              ) : ideasError ? (
                <div className="text-center py-8 sm:py-12 lg:py-16">
                  <div className="space-y-4">
                    <p className="text-red-400 text-sm">Failed to load ideas: {ideasError}</p>
                    <button
                      onClick={fetchUserIdeas}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-8 sm:py-12 lg:py-16">
                  {/* Pulsing glow effect behind the bulb */}
                  <div className="relative inline-block mb-6 sm:mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-lg animate-pulse"></div>
                    <div className="relative text-4xl sm:text-5xl lg:text-6xl">💡</div>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                      <p className="text-xl sm:text-2xl font-semibold text-white flex items-center justify-center gap-2">
                        🪄 No ideas yet
                      </p>
                      <p className="text-neutral-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                        Start by creating one — Vernaut will turn it into a full business concept ✨
                      </p>
                    </div>
                    
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNewIdea}
                      className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-300 shadow-lg"
                    >
                      <span className="mr-2">New Idea</span>
                      <span>💡</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ideas.map((idea, index) => (
                      <motion.div 
                        key={idea.id} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.5, delay: index * 0.1 }} 
                        className="group relative bg-neutral-800/30 border border-neutral-600/30 rounded-lg hover:border-neutral-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer overflow-hidden"
                        onClick={() => router.push(`/ideas/${idea.id}`)}
                      >
                      {/* Header with title and menu */}
                      <div className="flex items-start justify-between p-4 pb-2">
                        <h3 className="text-white font-medium text-lg line-clamp-2 flex-1 pr-2">{idea.title}</h3>
                        <button 
                          className="text-neutral-400 hover:text-white transition-colors p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Divider line */}
                      <div className="mx-4 h-px bg-gradient-to-r from-neutral-600/50 to-transparent"></div>
                      
                      {/* Content area */}
                      <div className="p-4 pt-3">
                        {/* Score and Risk indicators */}
                        <div className="flex items-center gap-3 mb-4">
                          {idea.score !== null && idea.score !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">💡</span>
                              <span className={`${
                                idea.score > 85 ? 'text-emerald-400' :
                                idea.score > 70 ? 'text-green-400' :
                                idea.score > 55 ? 'text-yellow-400' :
                                idea.score > 40 ? 'text-orange-400' :
                                'text-red-400'
                              } font-semibold`}>{idea.score}%</span>
                              <span className="text-neutral-300 text-sm">
                                {idea.score >= 85 ? 'Exceptional' :
                                 idea.score >= 70 ? 'Strong' :
                                 idea.score >= 55 ? 'Promising' :
                                 idea.score >= 40 ? 'Needs Focus' :
                                 'Early'}
                              </span>
                            </div>
                          )}
                          {idea.risk_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">⚠️</span>
                              <span className={`font-semibold ${
                                idea.risk_score <= 4.0 ? 'text-green-400' :
                                idea.risk_score <= 6.9 ? 'text-amber-400' :
                                'text-red-400'
                              }`}>{idea.risk_score}</span>
                              <span className="text-neutral-300 text-sm">
                                {idea.risk_level} Risk
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Created date */}
                        <div className="text-xs text-neutral-500 mb-4">
                          Created: {new Date(idea.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                        
                        {/* View Analysis button */}
                        <button 
                          className="w-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-300 hover:text-white hover:border-blue-400/50 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-300 rounded-lg py-2 px-4 text-sm font-medium group-hover:shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Analysis →
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* New Idea Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNewIdea}
                    className="group relative bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-2 border-dashed border-blue-500/30 rounded-lg hover:border-blue-400/50 hover:from-blue-600/20 hover:to-purple-600/20 transition-all duration-300 cursor-pointer overflow-hidden min-h-[200px] flex items-center justify-center"
                  >
                    <div className="text-center p-6">
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">💡</div>
                      <h3 className="text-white font-medium text-lg mb-2">Create New Idea</h3>
                      <p className="text-neutral-400 text-sm">Start analyzing your next startup idea</p>
                    </div>
                  </motion.div>
                </div>
              )}
              </div>
            </div>
          </motion.div>

          {/* Back to Home Link removed per request */}

          {/* Footer transparency note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-4 text-center"
          >
            <p className="text-xs text-neutral-400/70">✨ Early Access Preview · Feedback helps shape Vernaut 🚀</p>
          </motion.div>
        </div>
      </main>
  )
}
