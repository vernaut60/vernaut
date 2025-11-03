'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import NewIdeaModal from './NewIdeaModal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

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
  // Wizard fields
  status: string
  wizard_answers?: Record<string, unknown> | null
  current_step?: number | null
  total_questions?: number | null
  updated_at?: string | null
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

// Helper to calculate wizard progress
// Counts questions as "answered" only when user has moved to the next question (validated)
const getWizardProgress = (idea: Idea): { answered: number; total: number; percentage: number } => {
  const total = idea.total_questions || 0
  
  // A question is "answered" when current_step > questionIndex
  // If current_step = 0, they're on question 1, so 0 answered
  // If current_step = 3, they're on question 4, so questions 1-3 are answered (3 total)
  // So answered = current_step
  const answered = idea.current_step ?? 0
  
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0
  return { answered, total, percentage }
}

// Helper to determine if wizard is in progress
// In progress = questions ready AND user has moved past the first question
const isWizardInProgress = (idea: Idea): boolean => {
  return idea.status === 'questions_ready' && 
         (idea.current_step ?? 0) > 0
}

export default function DashboardPage({ onNewIdea }: DashboardPageProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasLoading, setIdeasLoading] = useState(true)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = useState(false)
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
  const fetchUserIdeas = async (): Promise<number> => {
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
        return data.ideas.length // Return count for stale session detection
      } else {
        throw new Error('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('Error fetching user ideas:', error)
      setIdeasError(error instanceof Error ? error.message : 'Failed to load ideas')
      return 0
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
      // Check if handoff might be in progress by looking for guest session ID
      const hasGuestSession = localStorage.getItem('guest-session-id')
      
      // Always fetch ideas immediately - don't wait for handoff
      // Handoff completion will trigger a refetch if needed
      let handoffCleanup: (() => void) | null = null
      
      if (hasGuestSession) {
        // Set up listener for handoff completion (in case user just signed up)
        // But don't block on it - fetch ideas immediately
        const handleHandoffComplete = () => {
          // Handoff completed - refetch ideas to include transferred guest idea
          fetchUserIdeas()
          // Clear the session ID after successful handoff
          localStorage.removeItem('guest-session-id')
        }
        
        window.addEventListener('handoff-complete', handleHandoffComplete)
        
        handoffCleanup = () => {
          window.removeEventListener('handoff-complete', handleHandoffComplete)
        }
        
        // Set a safety timeout: if handoff doesn't complete within 10 seconds,
        // assume session is stale and clear it
        const staleSessionTimeout = setTimeout(() => {
          const currentSession = localStorage.getItem('guest-session-id')
          // Only clear if it's still the same session (handoff never completed)
          if (currentSession === hasGuestSession) {
            localStorage.removeItem('guest-session-id')
          }
        }, 10000)
        
        // Store timeout cleanup in handoffCleanup
        const originalCleanup = handoffCleanup
        handoffCleanup = () => {
          originalCleanup()
          clearTimeout(staleSessionTimeout)
        }
      }
      
      // Fetch ideas and email immediately in parallel (never blocked by handoff)
      try {
        const [, ideasCount] = await Promise.all([getUserEmail(), fetchUserIdeas()])
        
        // After successful fetch, check if we got ideas
        // If user has ideas, handoff isn't needed - clear stale session if it exists
        if (hasGuestSession && ideasCount > 0) {
          // User already has ideas, so guest session is stale
          // Give handoff a moment to complete if it's happening, then clear
          setTimeout(() => {
            const currentSession = localStorage.getItem('guest-session-id')
            if (currentSession === hasGuestSession) {
              // Still same session means handoff didn't complete or isn't needed
              localStorage.removeItem('guest-session-id')
            }
          }, 2000) // 2s grace period for handoff if it's actually happening
        }
      } catch (error) {
        // If parallel execution fails, try fetchUserIdeas individually as fallback
        console.error('Error in parallel initialization:', error)
        try {
          await fetchUserIdeas()
        } catch (fetchError) {
          console.error('Failed to fetch ideas:', fetchError)
        }
      }
      
      // Return cleanup function (removes handoff listener if it was set up)
      return () => {
        handoffCleanup?.()
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
    setIsNewIdeaModalOpen(true)
    onNewIdea?.()
  }

  const handleCloseModal = () => {
    setIsNewIdeaModalOpen(false)
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
                    {/* Top-right New Idea button - Only show when user has ideas */}
                    {!ideasLoading && ideas.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="self-start sm:self-auto relative overflow-hidden group"
                      >
                        <Button onClick={handleNewIdea} className="relative">
                          <span className="mr-2 relative z-10">+</span>
                          <span className="relative z-10">New Idea</span>
                        </Button>
                      </motion.div>
                    )}
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
              <Card padding="lg" className="relative">
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
                    <Button onClick={fetchUserIdeas}>Try Again</Button>
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
                        Ready to validate your first idea?
                      </p>
                      <p className="text-neutral-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                        Get AI-powered insights on your problem, audience, solution, and monetization in minutes ✨
                      </p>
                    </div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button onClick={handleNewIdea} className="text-lg px-8 py-4">
                        <span className="mr-2">💡</span>
                        <span>Create Your First Idea</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ideas.map((idea, index) => {
                    // Render complete card (existing) if status is complete
                    if (idea.status === 'complete') {
                      return (
                        <motion.div 
                          key={idea.id} 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ duration: 0.5, delay: index * 0.1 }} 
                          className="group relative surface-card transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer overflow-hidden"
                          onClick={() => router.push(`/ideas/${idea.id}`)}
                        >
                          {/* Header with title and menu */}
                          <div className="flex items-start justify-between p-4 pb-2">
                            <h3 className="text-[var(--color-text)] font-medium text-lg line-clamp-2 flex-1 pr-2">{idea.title}</h3>
                            <button 
                              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Divider line */}
                          <div className="mx-4 h-px divider-subtle"></div>
                          
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
                                  <span className="text-[var(--color-text-muted)] text-sm">
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
                                  <span className="text-[var(--color-text-muted)] text-sm">
                                    {idea.risk_level} Risk
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Created date */}
                            <div className="text-xs text-[var(--color-text-muted)] mb-4">
                              Created: {new Date(idea.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                            
                            {/* View Analysis button */}
                            <Button 
                              className="w-full text-sm py-2 px-4"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/ideas/${idea.id}`)
                              }}
                            >
                              View Results →
                            </Button>
                          </div>
                        </motion.div>
                      )
                    }

                    // Render wizard status cards for other statuses
                    const progress = getWizardProgress(idea)
                    const inProgress = isWizardInProgress(idea)
                    
                    let statusConfig: {
                      icon: string
                      badge: string
                      badgeColor: string
                      message: string
                      subMessage: string
                      buttonText: string
                      route: string
                    }

                    switch (idea.status) {
                      case 'generating_questions':
                        statusConfig = {
                          icon: '🔄',
                          badge: 'Analyzing',
                          badgeColor: 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-500)] border-[var(--color-primary-500)]/30',
                          message: 'AI is analyzing your idea...',
                          subMessage: 'Questions will be ready soon',
                          buttonText: 'View Progress',
                          route: `/ideas/${idea.id}/wizard`
                        }
                        break
                      case 'questions_ready':
                        if (inProgress) {
                          const remaining = progress.total - progress.answered
                          statusConfig = {
                            icon: '⏸️',
                            badge: 'In Progress',
                            badgeColor: 'bg-[var(--color-warn)]/20 text-[var(--color-warn)] border-[var(--color-warn)]/30',
                            message: remaining === 1 ? '🎉 Almost there!' : 'Keep going!',
                            subMessage: remaining === 1 
                              ? 'Just 1 question left'
                              : `${progress.answered} of ${progress.total} questions answered`,
                            buttonText: 'Continue',
                            route: `/ideas/${idea.id}/wizard`
                          }
                        } else {
                          statusConfig = {
                            icon: '✨',
                            badge: 'Questions Ready',
                            badgeColor: 'bg-[var(--color-success)]/20 text-[var(--color-success)] border-[var(--color-success)]/30',
                            message: 'Your personalized questions are ready!',
                            subMessage: `Answer ${progress.total} questions to get your analysis`,
                            buttonText: 'Start Assessment',
                            route: `/ideas/${idea.id}/wizard`
                          }
                        }
                        break
                      case 'generating_stage1':
                        statusConfig = {
                          icon: '🔄',
                          badge: 'Generating Analysis',
                          badgeColor: 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-500)] border-[var(--color-primary-500)]/30',
                          message: 'Generating your analysis...',
                          subMessage: 'This usually takes ~60 seconds',
                          buttonText: 'View Progress',
                          route: `/ideas/${idea.id}` // TODO: Update when generating page exists
                        }
                        break
                      case 'generation_failed':
                      case 'stage1_failed':
                        statusConfig = {
                          icon: '❌',
                          badge: 'Generation Failed',
                          badgeColor: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border-[var(--color-danger)]/30',
                          message: 'Something went wrong',
                          subMessage: 'Please try again',
                          buttonText: 'Retry',
                          route: `/ideas/${idea.id}/wizard`
                        }
                        break
                      default:
                        statusConfig = {
                          icon: '🔄',
                          badge: 'Processing',
                          badgeColor: 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)] border-[var(--color-text-muted)]/30',
                          message: 'Processing...',
                          subMessage: 'Please wait',
                          buttonText: 'View',
                          route: `/ideas/${idea.id}`
                        }
                    }

                    return (
                      <motion.div 
                        key={idea.id} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.5, delay: index * 0.1 }} 
                        className="group relative surface-card transition-all duration-300 hover:scale-[1.02] hover:shadow-lg overflow-hidden"
                      >
                        {/* Header with title and menu */}
                        <div className="flex items-start justify-between p-4 pb-2">
                          <h3 className="text-[var(--color-text)] font-medium text-lg line-clamp-2 flex-1 pr-2">{idea.title}</h3>
                          <button 
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Divider line */}
                        <div className="mx-4 h-px divider-subtle"></div>
                        
                        {/* Content area */}
                        <div className="p-4 pt-3">
                          {/* Status badge - slightly bigger */}
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium mb-3 ${statusConfig.badgeColor}`}>
                            <span>{statusConfig.icon}</span>
                            <span>{statusConfig.badge}</span>
                          </div>
                          
                          {/* Status message */}
                          <div className="mb-3">
                            <p className="text-[var(--color-text)] font-medium mb-1">{statusConfig.message}</p>
                            {/* Only show subMessage if not showing progress bar (to avoid duplication) */}
                            {!(progress.total > 0 && (idea.status === 'questions_ready' || idea.status === 'generating_stage1')) && (
                              <p className="text-[var(--color-text-muted)] text-sm">{statusConfig.subMessage}</p>
                            )}
                          </div>
                          
                          {/* Progress bar - show for wizard states with questions */}
                          {progress.total > 0 && (idea.status === 'questions_ready' || idea.status === 'generating_stage1') && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
                                <span>📝 {progress.answered} of {progress.total} questions answered</span>
                                <span>{progress.percentage}%</span>
                              </div>
                              <div className="w-full bg-[var(--color-muted)] rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-accent-600)] h-full rounded-full transition-all duration-300"
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Time estimate */}
                          {idea.status === 'questions_ready' && progress.total > 0 && (
                            <div className="mb-4 text-xs text-[var(--color-text-muted)]">
                              ⏱️ {progress.answered === 0 
                                ? `Takes about ${Math.ceil(progress.total * 0.5)} minutes`
                                : progress.answered === progress.total
                                  ? 'Ready to submit!'
                                  : `~${Math.ceil((progress.total - progress.answered) * 0.5)} min remaining`
                              }
                            </div>
                          )}
                          
                          {/* Last updated timestamp */}
                          <div className="text-xs text-[var(--color-text-muted)] mb-4">
                            {idea.updated_at 
                              ? `Last updated: ${new Date(idea.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                              : `Created: ${new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            }
                          </div>
                          
                          {/* Action button */}
                          <Button 
                            className="w-full text-sm py-2 px-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(statusConfig.route)
                            }}
                          >
                            {statusConfig.buttonText} →
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
              </Card>
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

        {/* New Idea Modal */}
        <NewIdeaModal 
          isOpen={isNewIdeaModalOpen} 
          onClose={handleCloseModal} 
        />
      </main>
  )
}
