'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import WizardContainer from './_components/WizardContainer'
import LoadingState from './_components/LoadingState'
import QuestionRenderer from './_components/QuestionRenderer'
import ProgressBar from './_components/ProgressBar'
import NavigationButtons from './_components/NavigationButtons'
import { validateQuestion } from './_components/validation'

interface Question {
  id: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number'
  text: string
  required: boolean
  placeholder?: string
  help_text?: string
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

interface IdeaData {
  id: string
  status: string
  idea_text: string
  questions: Question[] | null
  wizard_answers: Record<string, unknown>
  current_step: number
  total_questions: number | null
}

export default function WizardPage() {
  const params = useParams()
  const { session } = useAuth()
  const { addToast } = useToast()
  const ideaId = params.id as string

  const [idea, setIdea] = useState<IdeaData | null>(null)
  const [status, setStatus] = useState<'loading' | 'generating_questions' | 'questions_ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch idea data
  const fetchIdea = useCallback(async () => {
    if (!session?.access_token) {
      setError('Authentication required')
      setStatus('error')
      return
    }

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      // Parse response (works for both success and error)
      let data: { success?: boolean; message?: string; idea?: Record<string, unknown> } = {}
      try {
        data = await response.json()
      } catch {
        // Response is not JSON (unlikely but handle gracefully)
        throw new Error(`Failed to fetch idea: ${response.statusText}`)
      }

      if (!response.ok) {
        // Backend returned error with message
        throw new Error(data.message || `Failed to fetch idea: ${response.statusText}`)
      }
      
      if (!data.success || !data.idea) {
        // If backend says success:false, use its message
        const backendMessage = data.message || 'Invalid response format'
        throw new Error(backendMessage)
      }
      
      // Check if idea has error_message (from failed generation)
      if (data.idea.error_message && typeof data.idea.error_message === 'string') {
        setError(data.idea.error_message)
        setStatus('error')
        return
      }

      // Type guard: ensure data.idea matches IdeaData structure
      if (
        typeof data.idea === 'object' &&
        data.idea !== null &&
        'id' in data.idea &&
        'status' in data.idea &&
        'idea_text' in data.idea
      ) {
        // Safe type assertion after type guard
        const ideaData = data.idea as unknown as IdeaData
        setIdea(ideaData)
        
        // Load wizard state from backend
        if (data.idea.questions && data.idea.status === 'questions_ready') {
          const currentStepValue = typeof data.idea.current_step === 'number' ? data.idea.current_step : 0
          setCurrentStep(currentStepValue)
          // Sync answers from backend (source of truth)
          // This ensures saved answers are visible when navigating back
          const wizardAnswers = data.idea.wizard_answers && typeof data.idea.wizard_answers === 'object' 
            ? (data.idea.wizard_answers as Record<string, unknown>) 
            : {}
          setAnswers(wizardAnswers)
        }
      }
      
      // Update status based on idea status (access after type guard)
      const ideaStatus = typeof data.idea === 'object' && data.idea !== null && 'status' in data.idea
        ? String(data.idea.status)
        : 'error'
      
      if (ideaStatus === 'generating_questions') {
        setStatus('generating_questions')
      } else if (ideaStatus === 'questions_ready') {
        setStatus('questions_ready')
      } else {
        setStatus('error')
        setError(`Unexpected status: ${ideaStatus}`)
      }
    } catch (err) {
      console.error('Error fetching idea:', err)
      setError(err instanceof Error ? err.message : 'Failed to load wizard')
      setStatus('error')
    }
  }, [ideaId, session?.access_token])

  // Initial load
  useEffect(() => {
    if (ideaId && session?.access_token) {
      fetchIdea()
    }
  }, [ideaId, session?.access_token, fetchIdea])

  // Polling for question generation
  useEffect(() => {
    if (status !== 'generating_questions') return

    const pollInterval = setInterval(() => {
      fetchIdea()
    }, 2000) // Poll every 2 seconds

    // Timeout after 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval)
      setError('Question generation is taking longer than expected. Please refresh the page.')
      setStatus('error')
    }, 60000)

    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [status, fetchIdea])

  // Silent save function for navigation (no UI feedback)
  const silentSave = useCallback(async (answersToSave: Record<string, unknown>, step: number) => {
    if (!session?.access_token || !ideaId) return

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wizard_answers: answersToSave,
          current_step: step
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Save failed:', errorData.message)
      } else {
        // Update local idea state with saved answers to keep it in sync
        setIdea(prev => prev ? {
          ...prev,
          wizard_answers: answersToSave,
          current_step: step,
          updated_at: new Date().toISOString()
        } : prev)
      }
      // Silent - no UI feedback for navigation saves
    } catch (err) {
      console.error('Save error:', err)
    }
  }, [ideaId, session?.access_token])

  // Auto-save function with UI feedback (for typing)
  const autoSave = useCallback(async (answersToSave: Record<string, unknown>, step: number) => {
    if (!session?.access_token || !ideaId) return

    setIsAutoSaving(true)
    setIsSaved(false)
    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wizard_answers: answersToSave,
          current_step: step
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Auto-save failed:', errorData.message)
      } else {
        // Update local idea state with saved answers to keep it in sync
        setIdea(prev => prev ? {
          ...prev,
          wizard_answers: answersToSave,
          current_step: step,
          updated_at: new Date().toISOString()
        } : prev)
        // Show saved indicator only for typing auto-save
        setIsSaved(true)
        // Hide saved indicator after 3 seconds
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current)
        }
        savedTimeoutRef.current = setTimeout(() => {
          setIsSaved(false)
        }, 3000)
      }
    } catch (err) {
      console.error('Auto-save error:', err)
    } finally {
      setIsAutoSaving(false)
    }
  }, [ideaId, session?.access_token])

  // Debounced auto-save handler
  const handleAnswerChange = useCallback((questionId: string, value: unknown) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    
    // Clear error for this question
    setErrors(prev => ({ ...prev, [questionId]: null }))
    
    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
    }
    
    // Debounce auto-save (1 second)
    autoSaveTimer.current = setTimeout(() => {
      autoSave(newAnswers, currentStep)
    }, 1000)
  }, [answers, currentStep, autoSave])

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log('[handleNext] Called', { currentStep, totalQuestions: idea?.questions?.length, answers })
    
    if (!idea?.questions || idea.questions.length === 0) {
      console.log('[handleNext] No questions available')
      return
    }
    
    const currentQuestion = idea.questions[currentStep]
    if (!currentQuestion) {
      console.log('[handleNext] Current question not found', { currentStep })
      return
    }

    // Validate current question
    const validationError = validateQuestion(currentQuestion, answers[currentQuestion.id])
    console.log('[handleNext] Validation', { questionId: currentQuestion.id, validationError, answer: answers[currentQuestion.id] })
    
    if (validationError) {
      console.log('[handleNext] Validation failed, setting error')
      setErrors(prev => ({ ...prev, [currentQuestion.id]: validationError }))
      // Scroll to the input field to show the error
      setTimeout(() => {
        const inputElement = document.getElementById(currentQuestion.id)
        if (inputElement) {
          inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          inputElement.focus()
        }
      }, 100)
      return
    }

    // Move to next question immediately (save silently in background)
    const totalQuestions = idea.questions.length
    if (currentStep < totalQuestions - 1) {
      const nextStep = currentStep + 1
      console.log('[handleNext] Moving to next step', { currentStep, nextStep })
      setCurrentStep(nextStep)
      // Auto-focus input after navigation (delay to allow render)
      setTimeout(() => {
        if (!idea.questions) return
        const nextQuestion = idea.questions[nextStep]
        if (nextQuestion) {
          const input = document.getElementById(nextQuestion.id)
          if (input) {
            input.focus()
            // For textarea, scroll into view
            if (input.tagName === 'TEXTAREA') {
              input.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }
        }
      }, 100)
      // Clear any error for the new question
      setErrors(prev => {
        if (!idea.questions) return prev
        const nextQuestion = idea.questions[nextStep]
        if (nextQuestion) {
          const newErrors = { ...prev }
          delete newErrors[nextQuestion.id]
          return newErrors
        }
        return prev
      })
      // Save silently in background (no "saved" indicator)
      silentSave(answers, nextStep).catch(err => {
        console.error('[handleNext] Silent save failed', err)
      })
    } else {
      console.log('[handleNext] Already on last question')
    }
  }, [idea?.questions, currentStep, answers, silentSave])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      // Clear any error for the previous question
      setErrors(prev => {
        const prevQuestion = idea?.questions?.[prevStep]
        if (prevQuestion) {
          const newErrors = { ...prev }
          delete newErrors[prevQuestion.id]
          return newErrors
        }
        return prev
      })
      // Sync answers from backend before navigating back to ensure saved answers are visible
      if (idea?.wizard_answers) {
        const backendAnswers = idea.wizard_answers as Record<string, unknown> || {}
        setAnswers(prev => ({
          ...backendAnswers,
          ...prev // Preserve any local unsaved changes for current question
        }))
      }
      // Save silently in background (no "saved" indicator)
      silentSave(answers, prevStep)
      // Auto-focus input after navigation (delay to allow render)
      setTimeout(() => {
        if (!idea?.questions) return
        const prevQuestion = idea.questions[prevStep]
        if (prevQuestion) {
          const input = document.getElementById(prevQuestion.id)
          if (input) {
            input.focus()
            // For textarea, scroll into view
            if (input.tagName === 'TEXTAREA') {
              input.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }
        }
      }, 100)
    }
  }, [currentStep, answers, silentSave, idea?.questions, idea?.wizard_answers])

  // Keyboard shortcuts: Ctrl/Cmd + Enter = Next, Shift + Tab = Back (when not in input)
  useEffect(() => {
    if (status !== 'questions_ready') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Only handle Ctrl/Cmd + Enter in inputs
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault()
          handleNext()
        }
        return
      }

      // Handle shortcuts outside inputs
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.shiftKey && e.key === 'Tab' && currentStep > 0) {
        e.preventDefault()
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status, currentStep, handleNext, handleBack])

  const handleComplete = useCallback(async () => {
    if (!idea?.questions || idea.questions.length === 0 || !session?.access_token) return
    const currentQuestion = idea.questions[currentStep]
    if (!currentQuestion) return

    // Validate all questions
    const allErrors: Record<string, string | null> = {}
    let hasErrors = false

    idea.questions.forEach((q) => {
      const error = validateQuestion(q, answers[q.id])
      if (error) {
        allErrors[q.id] = error
        hasErrors = true
      }
    })

    if (hasErrors) {
      setErrors(allErrors)
      // Scroll to first error
      const firstErrorId = Object.keys(allErrors)[0]
      if (firstErrorId) {
        document.getElementById(firstErrorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      addToast('Please complete all required questions', 'error')
      return
    }

    setIsSubmitting(true)
    
    // Add fade transition before completing
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      // TODO: Call complete-wizard endpoint when it's ready
      // For now, just show a message
      addToast('Wizard completion endpoint coming soon', 'info')
      
      // Placeholder: redirect to generating page
      // router.push(`/ideas/${ideaId}/generating`)
    } catch (err) {
      console.error('Error completing wizard:', err)
      addToast('Failed to submit answers. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }, [idea?.questions, currentStep, answers, session?.access_token, addToast])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  // Loading state
  if (status === 'loading') {
    return (
      <WizardContainer>
        <LoadingState message="Loading wizard..." />
      </WizardContainer>
    )
  }

  // Generating questions
  if (status === 'generating_questions') {
    return (
      <WizardContainer>
        <LoadingState 
          message="AI is analyzing your idea..."
          subMessage="Creating personalized questions (usually takes ~30 seconds)"
        />
      </WizardContainer>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <WizardContainer>
        <div className="text-center py-12">
          <div className="text-[var(--color-danger)] mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">Something went wrong</h2>
          <p className="text-[var(--color-text-muted)] mb-6">{error || 'An unexpected error occurred'}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Refresh Page
          </Button>
        </div>
      </WizardContainer>
    )
  }

  // Questions ready - show wizard
  if (status === 'questions_ready' && idea?.questions && idea.questions.length > 0) {
    const questions = idea.questions
    const totalQuestions = questions.length
    const currentQuestion = questions[currentStep]
    const isLastQuestion = currentStep === totalQuestions - 1

    return (
      <WizardContainer>
        <div className="max-w-3xl mx-auto">
          {/* Question Card */}
          <div className="surface-card p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl">
            {/* Progress Bar - moved inside card, above question */}
            <div className="mb-6">
              <ProgressBar currentStep={currentStep} totalSteps={totalQuestions} />
              <p className="text-sm text-[var(--color-text-muted)] mt-2 text-center">
                Question {currentStep + 1} of {totalQuestions}
              </p>
            </div>
            
            {/* Question with animation on step change */}
            <AnimatePresence mode="wait">
              {currentQuestion ? (
                <motion.div
                  key={currentStep} // Key changes trigger animation
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <QuestionRenderer
                    question={currentQuestion}
                    value={
                      answers[currentQuestion.id] ?? 
                      (idea?.wizard_answers as Record<string, unknown>)?.[currentQuestion.id] ?? 
                      null
                    }
                    onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    error={errors[currentQuestion.id]}
                    isSaving={isAutoSaving}
                    isSaved={isSaved}
                    isNextDisabled={
                      currentQuestion ? (() => {
                        const answer = answers[currentQuestion.id]
                        // Required check
                        if (currentQuestion.required) {
                          if (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
                            return true
                          }
                        }
                        // MinLength validation for text/textarea
                        if (currentQuestion.type === 'text' || currentQuestion.type === 'textarea') {
                          const minLength = currentQuestion.validation?.minLength
                          if (minLength && typeof answer === 'string' && answer.length < minLength) {
                            return true
                          }
                        }
                        return false
                      })() : false
                    }
                  />
                </motion.div>
              ) : (
                <p className="text-[var(--color-danger)]">Question not found</p>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <NavigationButtons
              canGoBack={currentStep > 0}
              canGoForward={true}
              isLastQuestion={isLastQuestion}
              onBack={handleBack}
              onNext={() => {
                console.log('[Next Button] Clicked')
                handleNext()
              }}
              onComplete={handleComplete}
              isSubmitting={isSubmitting}
              isNextDisabled={
                currentQuestion ? (() => {
                  const answer = answers[currentQuestion.id]
                  // Required check
                  if (currentQuestion.required) {
                    if (!answer || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
                      return true
                    }
                  }
                  // MinLength validation for text/textarea
                  if (currentQuestion.type === 'text' || currentQuestion.type === 'textarea') {
                    const minLength = currentQuestion.validation?.minLength
                    if (minLength && typeof answer === 'string' && answer.length < minLength) {
                      return true
                    }
                  }
                  return false
                })() : false
              }
            />
          </div>
        </div>
      </WizardContainer>
    )
  }

  return null
}

