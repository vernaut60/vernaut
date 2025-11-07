import { useEffect, useRef, useState } from 'react'

interface UseRefineTextOptions {
  idea: string
  hasAppliedRefined: boolean
  onRefinementReady?: (refinedText: string) => void
  onRefinementSkipped?: () => void
  onRefinementFailed?: () => void
  onEmptyIdea?: () => void
  onShortIdea?: () => void
}

interface UseRefineTextReturn {
  refinedPreview: string
  previewLoading: boolean
  previewError: string | null
  setRefinedPreview: (text: string) => void
  setPreviewError: (error: string | null) => void
  lastRefinedIdea: React.MutableRefObject<string>
}

/**
 * Shared hook for refine-text API calls
 * Handles debouncing, validation, error handling, and caching
 * 
 * @param idea - The idea text to refine
 * @param hasAppliedRefined - Whether the user has already applied a refined version
 * @param onRefinementReady - Callback when refinement succeeds (with refined text)
 * @param onRefinementSkipped - Callback when refinement is skipped (vague idea)
 * @param onRefinementFailed - Callback when refinement fails
 * @param onEmptyIdea - Callback when idea is empty (for component-specific cleanup)
 * @param onShortIdea - Callback when idea is too short (for component-specific cleanup)
 */
export function useRefineText({
  idea,
  hasAppliedRefined,
  onRefinementReady,
  onRefinementSkipped,
  onRefinementFailed,
  onEmptyIdea,
  onShortIdea
}: UseRefineTextOptions): UseRefineTextReturn {
  const [refinedPreview, setRefinedPreview] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewTimer = useRef<number | null>(null)
  const lastRefinedIdea = useRef<string>('')

  // Memoize callbacks to prevent unnecessary re-renders
  const onRefinementReadyRef = useRef(onRefinementReady)
  const onRefinementSkippedRef = useRef(onRefinementSkipped)
  const onRefinementFailedRef = useRef(onRefinementFailed)
  const onEmptyIdeaRef = useRef(onEmptyIdea)
  const onShortIdeaRef = useRef(onShortIdea)

  useEffect(() => {
    onRefinementReadyRef.current = onRefinementReady
    onRefinementSkippedRef.current = onRefinementSkipped
    onRefinementFailedRef.current = onRefinementFailed
    onEmptyIdeaRef.current = onEmptyIdea
    onShortIdeaRef.current = onShortIdea
  }, [onRefinementReady, onRefinementSkipped, onRefinementFailed, onEmptyIdea, onShortIdea])

  useEffect(() => {
    // Cleanup previous timer
    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current)
      previewTimer.current = null
    }

    // Reset state if idea is empty
    if (!idea.trim()) {
      setRefinedPreview('')
      setPreviewError(null)
      setPreviewLoading(false)
      lastRefinedIdea.current = ''
      if (onEmptyIdeaRef.current) {
        onEmptyIdeaRef.current()
      }
      return
    }

    // Count words in the input
    const wordCount = idea.trim().split(/\s+/).filter(word => word.length > 0).length

    // Require at least 3 words before refining to avoid generic suggestions for short inputs
    if (wordCount < 3) {
      setPreviewError(null)
      setPreviewLoading(false)
      setRefinedPreview('') // Clear any previous refinement for short inputs
      if (onShortIdeaRef.current) {
        onShortIdeaRef.current()
      }
      return
    }

    // Skip refinement if the idea is the same as what we last refined
    // Also skip if user has already applied the refined text
    // Note: We check refinedPreview via lastRefinedIdea.current to avoid dependency loop
    if (idea.trim() === lastRefinedIdea.current || hasAppliedRefined) {
      return
    }
    
    // Also skip if current refinedPreview matches the idea (user applied it)
    if (refinedPreview && idea.trim() === refinedPreview.trim()) {
      return
    }

    setPreviewError(null)
    
    // Adaptive debounce: longer inputs get slightly more time (user might still be composing)
    // Short inputs (3-10 words): 600ms (quick feedback)
    // Medium inputs (11-20 words): 800ms (let them finish the sentence)
    // Long inputs (21+ words): 1000ms (give them time to complete their thought)
    let debounceDelay = 600 // default
    if (wordCount > 20) {
      debounceDelay = 1000
    } else if (wordCount > 10) {
      debounceDelay = 800
    }
    
    // Track if component is still mounted (for cleanup)
    let isMounted = true
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
      
    previewTimer.current = window.setTimeout(async () => {
      if (!isMounted) return
      
      setPreviewLoading(true)
      
      // Set up timeout for fetch (15 seconds max)
      timeoutId = setTimeout(() => {
        if (isMounted) {
          controller.abort()
        }
      }, 15000)
      
      try {
        let res: Response
        try {
          res = await fetch('/api/refine-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea }),
            signal: controller.signal,
          })
        } catch (fetchError) {
          // Handle network errors (offline, DNS failure, etc.)
          if (fetchError instanceof Error) {
            if (fetchError.name === 'AbortError') {
              // Timeout - already handled by AbortController
              throw fetchError
            } else if (fetchError.message.includes('Failed to fetch') || 
                       fetchError.message.includes('NetworkError') ||
                       fetchError.message.includes('Network request failed')) {
              throw new Error('Network error. Please check your connection and try again.')
            }
          }
          throw fetchError
        }
        
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        // Handle non-OK responses
        if (!res.ok) {
          // Try to parse error response
          let errorMessage = 'Failed to refine your idea'
          try {
            const errorData = await res.json()
            errorMessage = errorData?.error || errorData?.message || errorMessage
            
            // Provide user-friendly messages for specific status codes
            if (res.status === 429) {
              errorMessage = 'Too many requests. Please wait a moment and try again.'
            } else if (res.status === 400) {
              errorMessage = errorData?.error || 'Invalid input. Please check your idea and try again.'
            } else if (res.status >= 500) {
              errorMessage = 'Server error. Please try again in a moment.'
            }
          } catch {
            // Response is not JSON, use status text
            errorMessage = res.status === 429 
              ? 'Too many requests. Please wait a moment and try again.'
              : res.status >= 500
              ? 'Server error. Please try again in a moment.'
              : `Request failed: ${res.statusText || 'Unknown error'}`
          }
          throw new Error(errorMessage)
        }
        
        // Parse JSON response
        let data: {
          success?: boolean
          refinedIdea?: string | null
          skipRefinement?: boolean
          error?: string
        }
        try {
          data = await res.json()
        } catch {
          throw new Error('Invalid response from server. Please try again.')
        }
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format. Please try again.')
        }
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to refine')
        }
        
        // If refinement was skipped, show guidance message instead
        if (data.skipRefinement) {
          // Validate guidance message exists
          const guidanceMessage = data.refinedIdea || '💡 Add more details to your idea for better refinement.'
          if (!isMounted) return
          
          setRefinedPreview(guidanceMessage)
          setPreviewError(null) // Clear any previous errors
          lastRefinedIdea.current = idea.trim() // Still update to prevent re-requesting
          
          // Call callback if provided
          if (onRefinementSkippedRef.current) {
            onRefinementSkippedRef.current()
          }
          return // Don't show "Use this" button for guidance messages
        }
        
        // Validate refined idea exists and is a string
        if (!data.refinedIdea || typeof data.refinedIdea !== 'string') {
          throw new Error('Received invalid refinement. Please try again.')
        }
        
        if (!isMounted) return
        
        setRefinedPreview(data.refinedIdea)
        lastRefinedIdea.current = idea.trim()
        
        // Call callback if provided
        if (onRefinementReadyRef.current) {
          onRefinementReadyRef.current(data.refinedIdea)
        }
      } catch (e: unknown) {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        // Don't set state if component unmounted
        if (!isMounted) return
        
        // Handle different error types
        if (e instanceof Error) {
          if (e.name === 'AbortError') {
            setPreviewError('Refinement took too long. Please try again.')
          } else {
            // Use error message (already user-friendly from our handling above)
            setPreviewError(e.message)
          }
        } else {
          setPreviewError('An unexpected error occurred. Please try again.')
        }
        
        setRefinedPreview('')
        
        // Call callback if provided
        if (onRefinementFailedRef.current) {
          onRefinementFailedRef.current()
        }
      } finally {
        if (isMounted) {
          setPreviewLoading(false)
        }
      }
    }, debounceDelay)

    return () => {
      // Mark as unmounted to prevent state updates
      isMounted = false
      
      // Cleanup timer
      if (previewTimer.current) {
        window.clearTimeout(previewTimer.current)
        previewTimer.current = null
      }
      
      // Abort any in-flight requests
      if (controller.signal && !controller.signal.aborted) {
        controller.abort()
      }
      
      // Clear timeout if still active
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, hasAppliedRefined]) // Removed refinedPreview to prevent infinite loop

  return {
    refinedPreview,
    previewLoading,
    previewError,
    setRefinedPreview,
    setPreviewError,
    lastRefinedIdea
  }
}

