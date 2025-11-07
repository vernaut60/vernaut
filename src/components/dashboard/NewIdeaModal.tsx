'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import RefinementPromptModal from './RefinementPromptModal'
import { useRefineText } from '@/hooks/useRefineText'

interface NewIdeaModalProps {
  isOpen: boolean
  onClose: () => void
}

// Placeholder examples removed - not currently used
// const PLACEHOLDER_EXAMPLES = [...]

export default function NewIdeaModal({ isOpen, onClose }: NewIdeaModalProps) {
  const router = useRouter()
  const { session } = useAuth()
  const { addToast } = useToast()
  const [idea, setIdea] = useState('')
  const [hasAppliedRefined, setHasAppliedRefined] = useState(false)
  const [showRefinementPrompt, setShowRefinementPrompt] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isWaitingForRefinement, setIsWaitingForRefinement] = useState(false)
  const [isCreatingIdea, setIsCreatingIdea] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<number | null>(null)
  const refinementWaitTimer = useRef<number | null>(null)
  const isWaitingRef = useRef(false) // Track waiting state in ref for closure access
  const proceedWithAnalysisRef = useRef<(() => Promise<void>) | null>(null)
  const checkAndShowPromptRef = useRef<(() => void) | null>(null)

  // Use shared refine-text hook
  const {
    refinedPreview,
    previewLoading,
    previewError,
    setRefinedPreview,
    setPreviewError
  } = useRefineText({
    idea,
    hasAppliedRefined,
    onEmptyIdea: useCallback(() => {
      setHasAppliedRefined(false)
    }, []),
    onRefinementSkipped: useCallback(() => {
      // If we were waiting for refinement and it was skipped, proceed with original
      if (isWaitingRef.current && proceedWithAnalysisRef.current) {
        setIsWaitingForRefinement(false)
        isWaitingRef.current = false
        // Clear wait timer
        if (refinementWaitTimer.current) {
          clearTimeout(refinementWaitTimer.current)
          refinementWaitTimer.current = null
        }
        // Proceed with original text since refinement was skipped
        setTimeout(() => {
          console.log('Refinement skipped (idea too vague), proceeding with original text')
          proceedWithAnalysisRef.current?.()
        }, 50)
      }
    }, []),
    onRefinementReady: useCallback(() => {
      // If we were waiting for refinement, trigger check
      if (isWaitingRef.current && checkAndShowPromptRef.current) {
        setIsWaitingForRefinement(false)
        isWaitingRef.current = false
        // Clear wait timer
        if (refinementWaitTimer.current) {
          clearTimeout(refinementWaitTimer.current)
          refinementWaitTimer.current = null
        }
        // Small delay to ensure state is updated
        setTimeout(() => {
          checkAndShowPromptRef.current?.()
        }, 50)
      }
    }, []),
    onRefinementFailed: useCallback(() => {
      // If we were waiting for refinement and it failed, proceed with original
      if (isWaitingRef.current && proceedWithAnalysisRef.current) {
        setIsWaitingForRefinement(false)
        isWaitingRef.current = false
        // Clear wait timer
        if (refinementWaitTimer.current) {
          clearTimeout(refinementWaitTimer.current)
          refinementWaitTimer.current = null
        }
        setTimeout(() => {
          console.log('Refinement failed, proceeding with original text')
          proceedWithAnalysisRef.current?.()
        }, 50)
      }
    }, [])
  })

  const maxLength = 1000
  const characterCount = idea.length
  const isOverLimit = characterCount > maxLength
  // Check if idea is too vague (showing guidance message instead of refined text)
  const isIdeaTooVague = refinedPreview && refinedPreview.startsWith('💡')
  const canSubmit = idea.trim().length >= 10 && !isOverLimit && !isIdeaTooVague

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Use requestAnimationFrame for smoother focus timing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          textareaRef.current?.focus()
        })
      })
    }
  }, [isOpen])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
      if (refinementWaitTimer.current) {
        clearTimeout(refinementWaitTimer.current)
      }
    }
  }, [])

  // Animated placeholder rotation - disabled (state variables removed)
  // useEffect(() => {
  //   if (!isOpen || idea.length > 0) return
  //   // Placeholder animation code removed - was unused
  // }, [isOpen, idea])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }

  // Removed "Don't ask again" persistence

  const handleAnalyzeIdea = async () => {
    if (!canSubmit) return
    
    // Clean up any existing wait timer
    if (refinementWaitTimer.current) {
      clearTimeout(refinementWaitTimer.current)
      refinementWaitTimer.current = null
    }
    
    // Check if refinement is currently in progress
    if (previewLoading) {
      // Wait for refinement to complete (max 4 seconds)
      setIsWaitingForRefinement(true)
      isWaitingRef.current = true
      
      const startTime = Date.now()
      const maxWaitTime = 4000 // 4 seconds max wait
      
      const checkRefinement = () => {
        // Use getElementById or access state via a callback pattern
        // Since we can't access latest state in closure, we'll rely on the
        // useEffect hooks that watch for state changes to handle completion
        const elapsed = Date.now() - startTime
        
        // If timeout reached
        if (elapsed >= maxWaitTime && isWaitingRef.current) {
          setIsWaitingForRefinement(false)
          isWaitingRef.current = false
          console.log('Refinement timeout, proceeding with original text')
          proceedWithAnalysis()
          return
        }
        
        // Continue checking if still waiting
        if (isWaitingRef.current) {
          refinementWaitTimer.current = window.setTimeout(checkRefinement, 100) as unknown as number
        }
      }
      
      // Start checking
      refinementWaitTimer.current = window.setTimeout(checkRefinement, 100) as unknown as number
      return
    }
    
    // Refinement not in progress - check if we should show prompt
    checkAndShowPrompt()
  }

  const proceedWithAnalysis = useCallback(async () => {
    const ideaText = idea.trim()
    
    if (!ideaText || ideaText.length < 10) {
      console.error('Idea text is too short')
      return
    }

    if (!session?.access_token) {
      console.error('No authentication token available')
      // Could show error toast here
      return
    }

    setIsCreatingIdea(true)

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          idea_text: ideaText
        })
      })

      if (!response.ok) {
        let errorData: { message?: string; details?: string } = { message: 'Unknown error' }
        try {
          errorData = await response.json()
        } catch {
          // Response might not be JSON
          errorData = { message: `Server error: ${response.status} ${response.statusText}` }
        }
        
        // Log full error details for debugging
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        throw new Error(errorData.message || errorData.details || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.id) {
        throw new Error('Invalid response from server')
      }

      // Success! Redirect to wizard
      onClose() // Close modal first
      router.push(`/ideas/${data.id}/wizard`)

    } catch (error) {
      console.error('Error creating idea:', error)
      setIsCreatingIdea(false)
      
      // Show user-friendly error message via toast
      const errorMessage = error instanceof Error ? error.message : 'Failed to create idea. Please try again.'
      
      // Clean up error messages for better UX
      let userMessage = errorMessage
      if (errorMessage.includes('already have an idea with this text')) {
        userMessage = 'You already have an idea with this text. Please modify it slightly and try again.'
      } else if (errorMessage.includes('too many ideas generating')) {
        userMessage = 'You have too many ideas being processed. Please wait for them to complete.'
      } else if (errorMessage.includes('Database error') || errorMessage.includes('schema')) {
        userMessage = 'Unable to save your idea right now. Please refresh the page and try again.'
      }
      
      addToast(userMessage, 'error')
    }
  }, [idea, refinedPreview, session?.access_token, router, onClose, addToast])

  // Store refs for use in hook callbacks
  useEffect(() => {
    proceedWithAnalysisRef.current = proceedWithAnalysis
  }, [proceedWithAnalysis])

  const checkAndShowPrompt = useCallback(() => {
    // Check if we should show refinement prompt
    const shouldShowPrompt = () => {
      return (
        !hasAppliedRefined &&
        refinedPreview &&
        !refinedPreview.startsWith('💡') && // Don't show prompt for guidance messages
        idea.trim() !== refinedPreview.trim() &&
        idea.trim().length > 0 &&
        !previewError // Don't show prompt if refinement failed
      )
    }

    if (shouldShowPrompt()) {
      // Show refinement prompt modal
      setShowRefinementPrompt(true)
    } else {
      // No prompt needed - proceed with analysis
      // If refinement failed, show subtle message and proceed
      if (previewError) {
        console.log('Refinement failed, proceeding with original text')
      }
      proceedWithAnalysis()
    }
  }, [hasAppliedRefined, refinedPreview, idea, previewError, proceedWithAnalysis])

  // Store ref for use in hook callbacks
  useEffect(() => {
    checkAndShowPromptRef.current = checkAndShowPrompt
  }, [checkAndShowPrompt])

  const handleReset = () => {
    setIdea('')
    setRefinedPreview('')
    setPreviewError(null)
    setHasAppliedRefined(false)
    setShowRefinementPrompt(false)
  }

  // Handle refinement prompt responses
  const handleAcceptRefinement = async () => {
    try {
      // Don't allow using guidance messages as refined text
      if (refinedPreview && !refinedPreview.startsWith('💡')) {
        setIdea(refinedPreview)
        setRefinedPreview('')
        setHasAppliedRefined(true)
        setShowRefinementPrompt(false)
        
        // Proceed with analysis after applying refinement
        setTimeout(() => {
          proceedWithAnalysis()
        }, 100)
      }
    } catch (error) {
      console.error('Error accepting refinement:', error)
    }
  }

  const handleRejectRefinement = async () => {
    try {
      setShowRefinementPrompt(false)
      // Mark that we've handled this refinement offer (user rejected it)
      // This prevents showing the prompt again when user clicks "Break It Down"
      setHasAppliedRefined(true)
      // Clear the refined preview so it doesn't trigger the prompt again
      setRefinedPreview('')
    } catch (error) {
      console.error('Error rejecting refinement:', error)
    }
  }

  // Removed "Don't ask again" handler

  const handleUseRefined = () => {
    // Don't allow using guidance messages as refined text
    if (refinedPreview && !refinedPreview.startsWith('💡')) {
      setIdea(refinedPreview)
      setRefinedPreview('')
      setHasAppliedRefined(true)
    }
  }

  // Track when user types new text after applying refined version
  const handleIdeaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newIdea = e.target.value
    setIdea(newIdea)
    
    // Set typing state
    setIsTyping(true)
    
    // Clear existing typing timer
    if (typingTimer.current) {
      clearTimeout(typingTimer.current)
    }
    
    // Set timer to clear typing state after user stops typing
    typingTimer.current = window.setTimeout(() => {
      setIsTyping(false)
    }, 1000) // 1 second delay
    
    // If user is typing new text, reset the applied flag so prompt can show again
    if (hasAppliedRefined && newIdea.trim() !== refinedPreview.trim()) {
      setHasAppliedRefined(false)
    }
    
    // Also reset if user clears the text
    if (newIdea.trim().length === 0) {
      setHasAppliedRefined(false)
    }
  }

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={handleBackdropClick}
          ref={modalRef}
          style={{ willChange: 'opacity' }}
        >
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ willChange: 'transform, opacity' }}
          >
            {/* Modal glow effect - lighter for performance */}
            <div className="absolute inset-0 rounded-3xl opacity-50" 
              style={{ boxShadow: '0 0 80px rgba(99,102,241,0.35)', willChange: 'opacity' }} 
              aria-hidden="true"
            />
            
            <div className="relative modal-panel">
              {/* Subtle shadow and depth overlay - removed backdrop-blur for performance */}
              <div className="absolute inset-0 bg-black/30 rounded-3xl" />
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">💡</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Share Your Idea</h2>
                      <p className="text-sm text-neutral-400">Get AI-powered insights in minutes</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="relative p-6">
                <div className="space-y-3">
                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={idea}
                    onChange={handleIdeaChange}
                    autoFocus
                    placeholder="e.g., An AI tool that predicts vineyard yield and automates irrigation."
                    className={`input-base h-32 resize-none min-h-[100px] sm:min-h-[120px] ${
                      isOverLimit 
                        ? 'border-red-500/50 focus:ring-red-500/30' 
                        : ''
                    }`}
                    maxLength={maxLength + 50} // Allow some overflow for better UX
                  />
                </div>

                {/* Dynamic AI feedback */}
                {idea.trim() && !hasAppliedRefined && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-neutral-400 italic leading-relaxed"
                  >
                    {previewLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        AI is refining your idea...
                      </span>
                    ) : refinedPreview ? (
                      <span className="flex items-center gap-2 text-blue-400">
                        ✨ AI refined suggestion ready.
                      </span>
                    ) : isTyping ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Keep typing... AI refines automatically when you pause.
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-pulse"></span>
                        Keep typing... AI refines automatically when you pause.
                      </span>
                    )}
                  </motion.div>
                )}

                {/* Static tip when no input */}
                {!idea.trim() && (
                  <p className="text-xs text-neutral-400 italic leading-relaxed">
                    💡 Include: Who it&apos;s for, what problem it solves, and your solution.<br />
                    Example: &quot;Time tracking tool for remote teams losing billable hours&quot;
                  </p>
                )}

                {/* Refined Preview - Lazy Loading */}
                {idea.trim() && (previewLoading || previewError || refinedPreview) && (
                  <div className="mt-3">
                    {/* Divider */}
                    <div className="border-t border-neutral-700/50 mb-3"></div>
                    
                    <div className="space-y-2">
                      {previewLoading ? (
                        <div className="bg-neutral-800/30 border border-neutral-600/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                            <span className="text-xs text-gray-400">AI is refining your idea...</span>
                          </div>
                          {/* Skeleton loading lines */}
                          <div className="space-y-2">
                            <div className="h-3 bg-gray-600/30 rounded shimmer animate-pulse w-4/5"></div>
                            <div className="h-3 bg-gray-600/30 rounded shimmer animate-pulse w-3/5"></div>
                            <div className="h-3 bg-gray-600/30 rounded shimmer animate-pulse w-2/3"></div>
                          </div>
                        </div>
                      ) : previewError ? (
                        <p className="text-red-400 text-xs transition-opacity duration-300">{previewError}</p>
                      ) : refinedPreview ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`bg-neutral-800/30 border rounded-lg p-3 space-y-2 transition-all duration-200 ${
                            refinedPreview.startsWith('💡')
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-neutral-600/30 cursor-pointer hover:bg-neutral-700/30'
                          }`}
                          onClick={!refinedPreview.startsWith('💡') ? handleUseRefined : undefined}
                        >
                          {refinedPreview.startsWith('💡') ? (
                            // Guidance message (not clickable)
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-400">💡 Suggestion:</span>
                              </div>
                              <p className="text-sm text-neutral-300 leading-relaxed">{refinedPreview.replace('💡 ', '')}</p>
                            </div>
                          ) : (
                            // Refined text (clickable)
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400">✨ AI Refined:</span>
                                <span className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                  Click to use this
                                </span>
                              </div>
                              <p className="text-sm text-neutral-200 leading-relaxed italic">&ldquo;{refinedPreview}&rdquo;</p>
                            </>
                          )}
                        </motion.div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Character count and hints */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {idea.length > 0 && idea.length < 10 && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Add more details (min 10 characters)
                      </span>
                    )}
                  </div>
                  
                    <div className="flex items-center gap-3">
                      {idea.length > 0 && (
                        <button
                          onClick={handleReset}
                          className="text-neutral-400 hover:text-white transition-colors text-xs"
                        >
                          Clear
                        </button>
                      )}
                      
                      {/* Character count moved to bottom-right */}
                      <span className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-neutral-500'}`}>
                        {characterCount}/{maxLength}
                      </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-ghost order-2 sm:order-1"
                  >
                    Cancel
                  </motion.button>
                  
                  <motion.button
                    onClick={handleAnalyzeIdea}
                    disabled={!canSubmit || isWaitingForRefinement || isCreatingIdea}
                    whileHover={canSubmit && !isWaitingForRefinement && !isCreatingIdea ? { scale: 1.02 } : {}}
                    whileTap={canSubmit && !isWaitingForRefinement && !isCreatingIdea ? { scale: 0.98 } : {}}
                    className={`order-1 sm:order-2 ${canSubmit ? 'btn-primary' : 'btn-primary'} ${!canSubmit || isWaitingForRefinement || isCreatingIdea ? 'disabled:opacity-60 cursor-not-allowed' : ''}`}
                    title={isIdeaTooVague ? 'Please improve your idea based on the suggestion above' : undefined}
                  >
                    {isCreatingIdea ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : isWaitingForRefinement ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Waiting for AI...</span>
                      </>
                    ) : (
                      <>
                        <span>Let&apos;s Go</span>
                        <span>🚀</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Refinement Prompt Modal - Outside main modal */}
      <RefinementPromptModal
        isOpen={showRefinementPrompt}
        onAccept={handleAcceptRefinement}
        onReject={handleRejectRefinement}
        onClose={() => {
          setShowRefinementPrompt(false)
          // Mark as handled so we don't show prompt again for this refinement
          setHasAppliedRefined(true)
          setRefinedPreview('')
        }}
        refinedText={refinedPreview}
        originalText={idea.trim()}
      />
    </>
  )
}
