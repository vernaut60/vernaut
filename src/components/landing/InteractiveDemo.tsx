'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import RefinementPromptModal from '@/components/dashboard/RefinementPromptModal'
import { useRefineText } from '@/hooks/useRefineText'

interface IdeaBreakdown {
  id: string
  idea_text: string
  problem: string
  audience: string
  solution: string
  monetization: string
  created_at: string
  ai_insights?: {
    tier?: 'weak' | 'average' | 'good' | 'exceptional'
    ai_verdict?: string
    strengths?: string[]
    challenges?: string[]
    recommendation?: string
  }
  score?: number
  risk_analysis?: {
    overall_score?: number
    risk_level?: string
    category_scores?: {
      business_viability?: number
      market_timing?: number
      competition_level?: number
      execution_difficulty?: number
    }
    explanations?: {
      business_viability?: string
      market_timing?: string
      competition_level?: string
      execution_difficulty?: string
    }
    top_risks?: Array<{
      title?: string
      severity?: string
      likelihood?: string
      description?: string
      mitigation?: string
    }>
  }
}

interface InteractiveDemoProps {
  onReset: () => void
}

export default function InteractiveDemo({ onReset }: InteractiveDemoProps) {
  // Idea state
  const [idea, setIdea] = useState('')
  const [originalIdea, setOriginalIdea] = useState('')
  const maxLength = 1000
  const characterCount = idea.length
  const isOverLimit = characterCount > maxLength // Store original idea for editing
  
  // Guest session management
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null)
  
  // Animated placeholder state
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [isPlaceholderAnimating, setIsPlaceholderAnimating] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Initialize guest session on component mount
  useEffect(() => {
    const initializeGuestSession = () => {
      // Clean up legacy session IDs
      localStorage.removeItem('vernaut-guest-session-id')
      console.log('🧹 Cleaned up legacy session ID')
      
      // Check if we already have a guest session
      let existingSessionId = localStorage.getItem('guest-session-id')
      
      if (!existingSessionId) {
        // Generate new guest session ID
        existingSessionId = 'guest-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('guest-session-id', existingSessionId)
        console.log('🆕 Created new guest session:', existingSessionId)
      } else {
        console.log('♻️ Using existing guest session:', existingSessionId)
      }
      
      setGuestSessionId(existingSessionId)
    }
    
    initializeGuestSession()
  }, [])
  
const PLACEHOLDER_EXAMPLES = [
  'An AI assistant that helps freelancers create contracts and track client payments automatically.',
  'A platform for small e-commerce brands to analyze customer behavior and suggest product improvements.',
  'A mobile app that connects local chefs with nearby customers for home-cooked meal delivery.',
]

  // Refinement state
  const [isRefinementCollapsing, setIsRefinementCollapsing] = useState(false)
  const [showRefinementPrompt, setShowRefinementPrompt] = useState(false)
  const [hasAppliedRefined, setHasAppliedRefined] = useState(false)
  
  // Use shared refine-text hook
  const {
    refinedPreview,
    previewLoading,
    previewError,
    setRefinedPreview,
    setPreviewError,
    lastRefinedIdea
  } = useRefineText({
    idea,
    hasAppliedRefined,
    onShortIdea: useCallback(() => {
      // Reset hasAppliedRefined when idea becomes too short
      if (hasAppliedRefined) {
        setHasAppliedRefined(false)
      }
    }, [hasAppliedRefined])
  })

  // Expansion state for breakdown results
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [breakdownData, setBreakdownData] = useState<IdeaBreakdown | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [revealedCards, setRevealedCards] = useState<number[]>([])
  const [currentSubtext, setCurrentSubtext] = useState(0)
  const [isResetting, setIsResetting] = useState(false)
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null)
  const [isInputDisabled, setIsInputDisabled] = useState(false)
  
  
  // Competitor analysis state
  const [competitorData, setCompetitorData] = useState<{ analysisId: string; count: number; categories: string[]; blurred: boolean } | null>(null)
  const [competitorError, setCompetitorError] = useState<string | null>(null)
  const [showVagueIdeaMessage, setShowVagueIdeaMessage] = useState(false)
  const [isBreakdownVague, setIsBreakdownVague] = useState(false)
  const [ideaScore, setIdeaScore] = useState<number | null>(null)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)
  const [shouldAnimateCTA, setShouldAnimateCTA] = useState(false)
  const [showRiskGuide, setShowRiskGuide] = useState(false)
  
  // Progress bar state
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState(0)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  
  // All tips mixed and matched across phases - memoized to prevent recreation on every render
  const allTips = useMemo(() => [
    // Validation & Research Tips
    "💡 42% of startups fail by building something nobody wants. Validation first, building second.",
    "🎯 The #1 mistake? Skipping customer research and jumping straight to code.",
    "💰 Founders who validate before building save an average of $47K in wasted development.",
    "⏱️ Speed beats perfection. Launch in 30 days, iterate based on real feedback.",
    
    // Behind-the-Scenes Tips
    "🔍 Cross-referencing against 500+ startup patterns...",
    "📊 Evaluating risk across 4 key dimensions: timing, competition, viability, execution...",
    "💡 Analyzing demand signals in your target market...",
    "⚡ Comparing against successful businesses in similar categories...",
    
    // Action-Oriented Tips
    "📋 We're preparing your personalized 3-step action plan...",
    "🎯 Identifying the fastest path to your first 10 customers...",
    "💡 Pinpointing your most compelling value proposition...",
    "🚀 Your custom roadmap is almost ready...",
    
    // Motivational Tips
    "🎉 Every great company started exactly where you are right now.",
    "🔥 You're already ahead of 90% who never validate.",
    "💪 Clarity beats confusion. Real answers incoming...",
    "⭐ Your idea deserves a fair shot. Let's see what we found...",
    
    // Execution Tips
    "⚡ Launch fast. Learn faster.",
    "💡 Ideas are cheap. Execution is everything.",
    "🎯 Done beats perfect.",
    "🚀 Ship it. Then ship it again.",
    "💪 Build. Measure. Learn. Repeat.",
    "🔥 Momentum beats motivation every time.",
    
    // Additional Mixed Tips
    "🎨 The best ideas solve real problems for real people.",
    "📈 Market timing can make or break even the best ideas.",
    "🤝 Your first 10 customers are worth more than your next 1000.",
    "💎 Differentiation is the key to standing out in crowded markets.",
    "⚡ Fast feedback loops lead to faster success.",
    "🎯 Focus beats feature creep every single time.",
    "💡 Customer interviews reveal insights that surveys never will.",
    "🚀 The best time to launch was yesterday. The second best is now."
  ], [])

  // Progress stages (40 seconds total) - memoized to prevent recreation on every render
  const progressStages = useMemo(() => [
    { 
      label: "🔍 Analyzing your business model...", 
      duration: 10000, 
      progress: 25
    },
    { 
      label: "⚔️ Scanning competitive landscape...", 
      duration: 10000, 
      progress: 50
    },
    { 
      label: "⚠️ Running risk analysis...", 
      duration: 10000, 
      progress: 75
    },
    { 
      label: "🎉 Almost ready...", 
      duration: 10000, 
      progress: 100
    }
  ], [])

  // Simple static number display
  const AnimatedNumber = ({ value }: { value: number }) => {
    return <span>{value}</span>
  }

  // Progress bar logic
  const startProgressBar = useCallback(() => {
    setProgress(0)
    setCurrentStage(0)
    setCurrentTipIndex(0)
    
    setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 0.5 // 0.5% every 200ms for smooth animation
        const stageIndex = Math.floor(newProgress / 25)
        
        setCurrentStage(prevStage => {
          if (stageIndex !== prevStage && stageIndex < progressStages.length) {
            setCurrentTipIndex(0) // Reset tip index for new stage
            return stageIndex
          }
          return prevStage
        })
        
        if (newProgress >= 100) {
          // Don't clear interval - keep it running for Phase 5
          return 100
        }
        
        return newProgress
      })
    }, 200)
    
  }, [progressStages.length]) // Removed currentStage - using functional setState instead
  
  const stopProgressBar = useCallback(() => {
    // Progress bar is now controlled by the interval variable directly
    setProgress(0)
    setCurrentStage(0)
  }, []) // Empty deps - using functional setState

  // Smooth scroll to competitor CTA
  const scrollToCompetitorCTA = () => {
    const element = document.getElementById('competitor-cta')
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      })
      
      // Trigger subtle animation after scroll
      setTimeout(() => {
        setShouldAnimateCTA(true)
        setTimeout(() => {
          setShouldAnimateCTA(false)
        }, 1000)
      }, 300)
    }
  }


  // Function to detect vague breakdown results
  const detectVagueBreakdown = (breakdown: IdeaBreakdown) => {
    const vagueIndicators = [
      // generic uncertainty
      'unclear',
      'vague',
      'ambiguous',
      'unspecific',
      'not clear',
      'needs clarification',
      'not enough detail',
      'too general',
      'too broad',
      'lack of context',
      'not sufficient information',
      'lacks clarity',
      'lacks detail',
      'too vague',

      // AI disclaimers or apologies
      'cannot assist',
      'cannot analyze',
      'not able to determine',
      'unable to determine',
      'insufficient data',
      'sorry',
      'as an ai',
      'not possible',
      'not enough info',

      // placeholder-like content
      'insert idea here',
      'your idea',
      'describe your idea',
      'more context required',
      'n/a',
      'none provided',

      // explicitly says the idea is invalid
      'invalid idea',
      'does not make sense',
      'not a valid concept',
      'needs more context',
      'too short',
      'too vague',
    ]

    const breakdownText = JSON.stringify(breakdown).toLowerCase()
    return vagueIndicators.some((word) => breakdownText.includes(word))
  }

  // Reset hasAppliedRefined when user types new text (different from refined preview)
  useEffect(() => {
    if (hasAppliedRefined && idea.trim() !== refinedPreview.trim()) {
      setHasAppliedRefined(false)
    }
  }, [idea, refinedPreview, hasAppliedRefined])

  const handleRefineIdea = async () => {
    if (!idea.trim() || isResetting) {
      console.log('🚫 handleRefineIdea blocked:', { idea: idea.trim(), isResetting })
      return
    }

    console.log('🚀 handleRefineIdea running - this should not happen during reset!')

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
      return
    }

    // No prompt needed - proceed with analysis
    proceedWithBreakdown()
  }

  const proceedWithBreakdown = async () => {
    proceedWithBreakdownWithText(refinedPreview.trim() || idea.trim())
  }

  const proceedWithBreakdownWithText = async (ideaToAnalyze: string) => {
    // Close the refined preview when starting analysis
    setIsRefinementCollapsing(true)

    // Store the original idea for editing functionality
    setOriginalIdea(idea.trim())

    setBreakdownLoading(true)
    setIsExpanded(true)
    setIsInputDisabled(true)
    
    // Clear refined preview state after a short delay to allow collapse animation
    setTimeout(() => {
      setRefinedPreview('')
      setPreviewError(null)
      setIsRefinementCollapsing(false)
      lastRefinedIdea.current = ''
    }, 300) // Match the collapse animation duration
    
    // Start timing
    const startTime = Date.now()

    try {
      // Await only the refine breakdown request so UI can render ASAP
      const breakdownResponse = await fetch('/api/refine-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-session-id': guestSessionId || 'anonymous-' + Date.now(),
        },
        body: JSON.stringify({ idea: ideaToAnalyze }),
      })

      const data = await breakdownResponse.json()

      if (data.success) {
        setBreakdownData(data.idea)
        
        // Check if breakdown results are vague
        const isVague = detectVagueBreakdown(data.idea)
        setIsBreakdownVague(isVague)
        
        // Use backend score with micro-loading
        setIsCalculatingScore(true)
        
        // Show "AI thinking" for 1.5 seconds before revealing score
        setTimeout(() => {
          setIdeaScore(data.idea.score || 0)
          setIsCalculatingScore(false)
        }, 1500)
        
        console.log(`Breakdown analysis completed`, { isVague, score: data.idea.score })
        console.log('Full API response:', data)
        console.log('Competitor analysis in response:', data.idea.competitor_analysis)
        console.log('API response keys:', Object.keys(data.idea || {}))
        
        // Reset vague state since API call succeeded
        setIsBreakdownVague(false)
        
        // Use competitor analysis from main API response
        if (data.idea.competitor_analysis) {
          console.log('Setting competitor data:', data.idea.competitor_analysis)
          setCompetitorData(data.idea.competitor_analysis)
          // Calculate total analysis duration since everything is now in one call
          const totalDuration = Date.now() - startTime
          setAnalysisDuration(totalDuration)
          console.log(`Total analysis completed in ${totalDuration}ms (${Math.round(totalDuration / 1000)} seconds)`)
        } else {
          console.log('Competitor analysis not set:', { isVague, hasCompetitorAnalysis: !!data.idea.competitor_analysis })
        }
        
        // Re-enable input after analysis completes
        setIsInputDisabled(false)
      } else {
        // Handle API error (like vague input rejection)
        console.log('Breakdown API error:', data.error)
        setIsBreakdownVague(true)
        setBreakdownData({
          id: 'error',
          idea_text: ideaToAnalyze,
          problem: 'Idea too vague to analyze',
          audience: 'Please provide more details',
          solution: 'Try describing what it does or who it helps',
          monetization: 'Add more context for analysis',
          created_at: new Date().toISOString()
        })
        
        // Re-enable input after error
        setIsInputDisabled(false)
        // Ensure loading state is cleared for vague ideas
        setBreakdownLoading(false)
      }
    } catch (error) {
      console.error('Breakdown analysis error:', error)
      setIsBreakdownVague(true)
      setBreakdownData({
        id: 'error',
        idea_text: ideaToAnalyze,
        problem: 'Analysis failed',
        audience: 'Please try again',
        solution: 'Check your input and retry',
        monetization: 'Ensure idea is clear and business-related',
        created_at: new Date().toISOString()
      })
      
      // Re-enable input after catch error
      setIsInputDisabled(false)
    } finally {
      setBreakdownLoading(false)
    }
  }

  // Competitor analysis is now included in the main API response

  // Progress bar effect
  useEffect(() => {
    if (breakdownLoading) {
      startProgressBar()
    } else {
      stopProgressBar()
    }
    
    return () => {
      stopProgressBar()
    }
  }, [breakdownLoading, startProgressBar, stopProgressBar])

  // Tip cycling effect - now uses mixed tips from all categories
  useEffect(() => {
    if (!breakdownLoading) return

    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % allTips.length)
    }, 3000) // Cycle every 3 seconds
    
    return () => clearInterval(tipInterval)
  }, [breakdownLoading, allTips.length]) // Removed progress - was causing constant recreations

  // Progressive card reveal effect
  useEffect(() => {
    if (breakdownLoading) {
      setRevealedCards([])
      setCurrentSubtext(0)
      
      // Sequential reveal with micro-stagger timing
      const timeouts: number[] = []
      
      timeouts.push(window.setTimeout(() => setRevealedCards([0]), 0)) // Problem - immediate
      timeouts.push(window.setTimeout(() => setRevealedCards([0, 1]), 1000)) // Audience - after 1s
      timeouts.push(window.setTimeout(() => setRevealedCards([0, 1, 2]), 2000)) // Solution - after 2s
      timeouts.push(window.setTimeout(() => setRevealedCards([0, 1, 2, 3]), 3000)) // Monetization - after 3s
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout))
      }
    } else {
      setRevealedCards([])
      setCurrentSubtext(0)
    }
  }, [breakdownLoading])

  // Rotating subtext effect
  useEffect(() => {
    if (breakdownLoading) {
      // Sync subtext with card reveals
      const timeouts: number[] = []
      
      timeouts.push(window.setTimeout(() => setCurrentSubtext(0), 0)) // Problem
      timeouts.push(window.setTimeout(() => setCurrentSubtext(1), 1000)) // Audience
      timeouts.push(window.setTimeout(() => setCurrentSubtext(2), 2000)) // Solution
      timeouts.push(window.setTimeout(() => setCurrentSubtext(3), 3000)) // Monetization
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout))
      }
    }
  }, [breakdownLoading])

  // Animated placeholder cycling
  useEffect(() => {
    if (idea.trim()) return // Stop animation when user is typing

    const interval = setInterval(() => {
      setIsPlaceholderAnimating(true)
      
      setTimeout(() => {
        setCurrentPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length)
        setIsPlaceholderAnimating(false)
      }, 500) // Match the CSS transition duration
    }, 4000) // Change every 4 seconds for better readability

    return () => clearInterval(interval)
  }, [idea, PLACEHOLDER_EXAMPLES.length])

  const handlePaste = () => {
    // Optional: Add visual feedback for paste
  }

  // Handle refinement prompt responses
  const handleAcceptRefinement = async () => {
    try {
      // Don't allow using guidance messages as refined text
      if (refinedPreview && !refinedPreview.startsWith('💡')) {
        const refinedText = refinedPreview
        setIdea(refinedText)
        setRefinedPreview('')
        setHasAppliedRefined(true)
        setShowRefinementPrompt(false)
        
        // Proceed with breakdown after applying refinement
        // Use the refined text directly
        setTimeout(() => {
          proceedWithBreakdownWithText(refinedText)
        }, 100)
      }
    } catch (error) {
      console.error('Error accepting refinement:', error)
    }
  }

  const handleRejectRefinement = async () => {
    try {
      const originalText = idea.trim()
      setShowRefinementPrompt(false)
      // Mark that we've handled this refinement offer (user rejected it)
      setHasAppliedRefined(true)
      setRefinedPreview('')
      
      // Proceed with original text
      setTimeout(() => {
        proceedWithBreakdownWithText(originalText)
      }, 100)
    } catch (error) {
      console.error('Error rejecting refinement:', error)
    }
  }

  const handleReset = () => {
    // Simple reset - let Framer Motion handle the smooth transition
    setIsExpanded(false)
    setIsCollapsing(false)
    
    // Clear all states immediately
    setBreakdownData(null)
    setCompetitorData(null)
    setRefinedPreview('')
    setPreviewError(null)
    setIsRefinementCollapsing(false)
    lastRefinedIdea.current = ''
    setCompetitorError(null)
    setShowVagueIdeaMessage(false)
    setIsBreakdownVague(false)
    setIdeaScore(null)
    setIsCalculatingScore(false)
    setRevealedCards([])
    setCurrentSubtext(0)
    setIsResetting(false)
    setAnalysisDuration(null)
    
    // Clear the idea state
    setIdea('')
    setOriginalIdea('')
    setIsInputDisabled(false)
    
    // Reset parent component
    onReset()
    
    // Focus textarea after a short delay
    setTimeout(() => {
      const textareaElement = document.getElementById('idea')
      if (textareaElement) {
        textareaElement.focus()
      }
    }, 100)
  }

  const handleEditIdea = () => {
    // Return to input state with original idea text
    setIsExpanded(false)
    setIsCollapsing(false)

    // Clear analysis states but keep original idea
    setBreakdownData(null)
    setCompetitorData(null)
    setRefinedPreview('')
    setPreviewError(null)
    setIsRefinementCollapsing(false)
    lastRefinedIdea.current = ''
    setCompetitorError(null)
    setShowVagueIdeaMessage(false)
    setIsBreakdownVague(false)
    setIdeaScore(null)
    setIsCalculatingScore(false)
    setRevealedCards([])
    setCurrentSubtext(0)
    setIsResetting(false)
    setAnalysisDuration(null)

    // Restore the original idea text
    setIdea(originalIdea)
    setIsInputDisabled(false)
  }


  return (
    <div className="w-full overflow-x-hidden">
      <AnimatePresence mode="wait">
        {isExpanded && breakdownData && !isBreakdownVague && (competitorData || showVagueIdeaMessage) ? (
          // Completion overlay
          <motion.div
            key="completion"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full resize-none rounded-2xl border border-emerald-500/30 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/40 outline-none p-6 text-base shadow-[0_0_40px_rgba(16,185,129,0.25)] bg-black/60 backdrop-blur-sm relative overflow-hidden min-h-[200px] flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 50%, transparent 100%)'
            }}
          >
            <div className="text-center relative z-10">
              <div className="text-2xl mb-2">✨</div>
              <p className="font-semibold text-xl flex items-center justify-center gap-2">
                <span className="text-2xl">🎉</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                  Your idea just got validated!
                </span>
              </p>
              <p className="text-neutral-300 text-sm mb-2">Your business insights are ready to explore.</p>
              
              {/* Analysis duration - shown immediately */}
              {analysisDuration ? (
                <p className="text-xs text-gray-400 italic mb-4">
                  Generated in {Math.round(analysisDuration / 1000)} seconds ⏱️
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic mb-4">
                  Generated in 4 seconds ⏱️
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                <button
                  onClick={handleEditIdea}
                  className="text-sm text-blue-400 hover:text-blue-300 underline transition-all duration-300 hover:scale-105"
                >
                  ✏️ Edit Idea
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-indigo-400 hover:text-indigo-300 underline transition-all duration-300 hover:scale-105"
                >
                  💡 Try a New Idea
                </button>
              </div>
            </div>
          </motion.div>
        ) : isExpanded && breakdownData && isBreakdownVague ? (
          // Vague breakdown message
          <motion.div
            key="vague-breakdown"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full resize-none rounded-2xl border border-amber-500/30 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/40 outline-none p-6 text-base shadow-[0_0_40px_rgba(245,158,11,0.25)] bg-black/60 backdrop-blur-sm relative overflow-hidden min-h-[200px] flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 50%, transparent 100%)'
            }}
          >
            <div className="text-center relative z-10">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 font-semibold text-xl drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                Analysis Incomplete
              </p>
              <p className="text-neutral-300 text-sm mb-2">Your idea seems too broad or unclear for a proper analysis.</p>
              <p className="text-neutral-400 text-xs mb-4">Try adding more details — what does it do or who is it for?</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                <button
                  onClick={handleEditIdea}
                  className="text-sm text-blue-400 hover:text-blue-300 underline transition-all duration-300 hover:scale-105"
                >
                  ✏️ Edit Idea
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm text-amber-400 hover:text-amber-300 underline transition-all duration-300 hover:scale-105"
                >
                  💡 Try a New Idea
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          // Textarea
          <motion.div
            key="textarea"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full"
          >
            <label htmlFor="idea" className="sr-only">Describe the idea</label>
            <div className="relative">
              <textarea
                id="idea"
                rows={10}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                maxLength={maxLength + 50} // Allow some overflow for better UX
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && e.shiftKey === false)) {
                    e.preventDefault()
                    // Optional: Add keyboard shortcut for demo
                  }
                }}
                onPaste={handlePaste}
                ref={textareaRef}
                disabled={isInputDisabled}
                className={`w-full resize-none rounded-2xl border outline-none p-6 text-base shadow-lg transition-all duration-700 hover:shadow-xl relative ${
                  idea.trim() ? 'bg-neutral-900 text-white' : 'bg-transparent text-transparent'
                } ${
                  isOverLimit 
                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30' 
                    : 'border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 hover:border-neutral-700'
                } ${isInputDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  caretColor: idea.trim() ? 'white' : 'rgb(156, 163, 175)' // gray-400
                }}
                placeholder=""
              />
              
              {/* Animated placeholder overlay */}
              {!idea.trim() && (
                <div className="absolute inset-0 p-6 pointer-events-none flex items-start">
                  <div className={`text-base leading-relaxed transition-all duration-500 ease-in-out ${
                    isPlaceholderAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                  } text-neutral-500`}>
                    {PLACEHOLDER_EXAMPLES[currentPlaceholderIndex]}
                  </div>
                </div>
              )}
              
              {/* Analysis overlay - masks input during analysis */}
              {isInputDisabled && (
                <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <div className="text-center w-full max-w-sm px-6">
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-300">
                          {progressStages[currentStage]?.label || "Processing..."}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-700/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Stage indicator */}
                    <div className="flex justify-center space-x-2 mb-3">
                      {progressStages.map((stage, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index <= currentStage 
                              ? 'bg-blue-500' 
                              : 'bg-neutral-600'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Tips section */}
                    <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                      <div className="text-xs text-neutral-300 leading-relaxed transition-opacity duration-500">
                        {allTips[currentTipIndex] || "Processing your idea..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refined preview section - only show when there's content, loading, or collapsing, but hide during main analysis and when results are available */}
      {idea.trim() && !breakdownLoading && !breakdownData && (previewLoading || previewError || refinedPreview || isRefinementCollapsing) && (
        <div className="mt-4">
          {/* Divider */}
          <div className="border-t border-neutral-700/50 mb-4"></div>
          
          {/* Refined preview section */}
          <div className={`p-4 bg-neutral-800/30 border border-neutral-600/50 rounded-xl backdrop-blur-sm transition-all duration-300 ${
            isRefinementCollapsing 
              ? 'animate-[collapseUp_0.3s_ease-in_forwards]' 
              : 'opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-neutral-400">
                {previewLoading ? "✨ Refining your idea…" : "✨ Here's your refined idea statement"}
              </span>
            </div>
            <div className="min-h-[60px]">
              {previewLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-700/60 rounded shimmer animate-pulse"></div>
                  <div className="h-4 bg-neutral-700/60 rounded shimmer w-4/5 animate-pulse"></div>
                </div>
              ) : previewError ? (
                <p className="text-red-400 text-sm transition-opacity duration-300">{previewError}</p>
              ) : refinedPreview ? (
                <div 
                  className={`transition-all duration-300 ease-out animate-[fadeInLeft_0.3s_ease-out_forwards] rounded-lg p-3 ${
                    refinedPreview.startsWith('💡')
                      ? 'bg-amber-500/5 border border-amber-500/30 mt-2'
                      : 'cursor-pointer hover:bg-neutral-800/30 -m-3'
                  }`}
                  onClick={!refinedPreview.startsWith('💡') ? () => setIdea(refinedPreview) : undefined}
                >
                  {refinedPreview.startsWith('💡') ? (
                    // Guidance message (not clickable)
                    <div className="space-y-1">
                      <p className="text-xs text-amber-400 mb-1">💡 Suggestion:</p>
                      <p className="text-neutral-300 leading-relaxed">{refinedPreview.replace('💡 ', '')}</p>
                    </div>
                  ) : (
                    // Refined text (clickable)
                    <>
                      <p className="text-neutral-300 leading-relaxed italic">&ldquo;{refinedPreview}&rdquo;</p>
                      <p className="text-neutral-400 text-xs mt-2">Click to use this refined version</p>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Show button and subtext - only when not expanded */}
      {!isExpanded && (
        <div className="mt-6 flex flex-col items-center">
          {/* Character count indicator */}
          {idea.length > 0 && (
            <div className="mb-3 flex items-center justify-end text-xs">
              <span className={`${isOverLimit ? 'text-red-400' : 'text-neutral-500'}`}>
                {characterCount}/{maxLength}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefineIdea}
            disabled={breakdownLoading || !idea.trim() || idea.trim().length < 10 || !!(refinedPreview && refinedPreview.startsWith('💡')) || isOverLimit || previewLoading}
            className="relative inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none transition-all duration-300 hover:shadow-xl hover:scale-105 hover:animate-pulse active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md btn-sweep overflow-hidden group"
            style={{ 
              background: 'linear-gradient(45deg, #667eea, #764ba2, #667eea)',
              backgroundSize: '200% 200%',
              animation: 'gradientShift 3s ease infinite'
            }}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 animate-[gradientShift_3s_ease_infinite]"></div>
            
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[glow_2s_ease-in-out_infinite]"></div>
            
            {/* Floating particles on hover */}
            {!breakdownLoading && (
              <>
                {/* Sparkle effects */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[sparkle_1s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
                <div className="absolute -top-2 -left-1 w-1.5 h-1.5 bg-yellow-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[sparkle_1s_ease-in-out_infinite]" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute -bottom-1 -right-2 w-1 h-1 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[sparkle_1s_ease-in-out_infinite]" style={{ animationDelay: '0.6s' }}></div>
                
                {/* Floating particles */}
                <div className="absolute -top-3 -left-2 w-1 h-1 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[floatUp_2s_ease-out_infinite]" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute -top-4 -right-3 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[floatUp_2.5s_ease-out_infinite]" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-3 -left-3 w-1 h-1 bg-pink-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[floatUp_2.2s_ease-out_infinite]" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute -bottom-4 -right-1 w-1 h-1 bg-cyan-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-[floatUp_2.8s_ease-out_infinite]" style={{ animationDelay: '2s' }}></div>
              </>
            )}
            
            {/* Ripple effect on click */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-active:scale-100 group-active:animate-[ripple_0.6s_ease-out] opacity-0 group-active:opacity-100"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center">
              {breakdownLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  <span>Analyzing your idea</span>
                  <div className="ml-2 flex space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-[progressDots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-[progressDots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-[progressDots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </>
              ) : previewLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  <span>✨ Polishing your idea...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Break It Down</span>
                  <span className="ml-2 text-lg animate-bounce">🚀</span>
                </>
              )}
            </div>
          </button>
          <p className="mt-3 text-xs text-neutral-500">
            ⚡ Free to try — no signup required
          </p>
        </div>
      )}

      {/* Results section */}
      {(isExpanded || isCollapsing) && (
        <div className={`mt-4 mb-8 p-6 bg-neutral-800/30 border border-neutral-600/50 rounded-xl backdrop-blur-sm transition-all duration-300 w-full ${
          isCollapsing
            ? 'opacity-0 translate-y-2'
            : 'animate-[expandDown_0.6s_ease-out_forwards] opacity-0'
        }`}>
          {breakdownLoading ? (
            <div className="space-y-4">
              {/* Enhanced loading indicator */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-8 h-8 border-2 border-transparent border-t-emerald-300 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <span className="text-sm font-medium text-neutral-300">Analyzing your idea</span>
                </div>
                <p className="text-sm text-neutral-400 mb-2 transition-all duration-500 ease-in-out">
                  {breakdownLoading ? [
                    "🔍 Identifying key problems...",
                    "👥 Defining your target audience...",
                    "💡 Shaping a solution...",
                    "💰 Exploring monetization models..."
                  ][currentSubtext] : "Preparing your business breakdown..."}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <p className="text-xs text-neutral-500 mt-3">
                  This usually takes less than ~30 seconds
                </p>
              </div>
              
              {/* Skeleton cards with progressive reveal */}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { icon: "🎯", title: "Problem", color: "text-blue-400", bgColor: "from-blue-900/20 to-blue-800/10", borderColor: "border-blue-500/30" },
                  { icon: "👥", title: "Audience", color: "text-green-400", bgColor: "from-green-900/20 to-green-800/10", borderColor: "border-green-500/30" },
                  { icon: "💡", title: "Solution", color: "text-purple-400", bgColor: "from-purple-900/20 to-purple-800/10", borderColor: "border-purple-500/30" },
                  { icon: "💰", title: "Monetization", color: "text-yellow-400", bgColor: "from-yellow-900/20 to-yellow-800/10", borderColor: "border-yellow-500/30" }
                ].map((section, i) => {
                  const isRevealed = revealedCards.includes(i)
                  return (
                    <div 
                      key={i} 
                      className={`p-4 bg-gradient-to-br ${section.bgColor} rounded-lg border ${section.borderColor} transition-all duration-500 ${
                        isRevealed 
                          ? 'opacity-100 transform translate-y-0 animate-[fadeInUp_0.4s_ease-out_forwards]' 
                          : 'opacity-0 transform translate-y-4'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-lg ${isRevealed ? `${section.color} animate-pulse` : 'text-neutral-500'}`}>
                          {section.icon}
                        </span>
                        <h3 className={`text-sm font-semibold ${isRevealed ? section.color : 'text-neutral-500'}`}>
                          {section.title}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {isRevealed ? (
                          <>
                            <div className="h-3 bg-neutral-600/50 rounded shimmer animate-pulse"></div>
                            <div className="h-3 bg-neutral-600/50 rounded shimmer w-4/5 animate-pulse"></div>
                            <div className="h-3 bg-neutral-600/50 rounded shimmer w-3/5 animate-pulse"></div>
                            <div className="h-3 bg-neutral-600/50 rounded shimmer w-2/3 animate-pulse"></div>
                          </>
                        ) : (
                          <div className="h-12 bg-neutral-800/30 rounded"></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : breakdownData ? (
            <div className="space-y-3">
              {/* Idea Strength Meter */}
              {(ideaScore || isCalculatingScore) && (
                <div className="text-center mb-4 p-3 bg-gradient-to-r from-neutral-800/50 to-neutral-700/30 rounded-xl border border-neutral-600/30 relative z-0">
                  {isCalculatingScore ? (
                    // AI Thinking state
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <span className="text-sm font-medium text-neutral-300">Crunching the numbers...</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : (
                    // Score revealed state
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-sm font-medium text-neutral-300">💡 Your idea scored:</span>
                        <span className={`text-lg font-bold animate-[fadeInUp_0.5s_ease-out_forwards] ${
                          ideaScore! > 85 ? 'text-emerald-400' :
                          ideaScore! > 70 ? 'text-green-400' :
                          ideaScore! > 55 ? 'text-yellow-400' :
                          ideaScore! > 40 ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          <AnimatedNumber value={ideaScore!} />%
                        </span>
                        {/* AI Insights tier display - COMMENTED OUT FOR DEMO */}
                        {/* {breakdownData?.ai_insights?.tier && (
                          <>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              breakdownData.ai_insights.tier === 'weak' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                              breakdownData.ai_insights.tier === 'average' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                              breakdownData.ai_insights.tier === 'good' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                              breakdownData.ai_insights.tier === 'exceptional' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
                              'bg-neutral-500/15 text-neutral-300 border border-neutral-500/30'
                            }`}>
                              {breakdownData.ai_insights.tier === 'weak' ? 'Weak' :
                               breakdownData.ai_insights.tier === 'average' ? 'Average' :
                               breakdownData.ai_insights.tier === 'good' ? 'Good' :
                               breakdownData.ai_insights.tier === 'exceptional' ? 'Exceptional' :
                               'Unknown'}
                            </span>
                          </>
                        )} */}
                      </div>
                      {/* Risk-adjusted explanation subtext */}
                      <div className="text-xs text-neutral-400 mb-2">
                        {ideaScore! >= 85 && 'Exceptional — clear edge, strong pull, solid viability.'}
                        {ideaScore! >= 70 && ideaScore! < 85 && 'Strong — distinct value and good timing; validate pricing and GTM.'}
                        {ideaScore! >= 55 && ideaScore! < 70 && 'Promising — focus the niche and sharpen differentiation.'}
                        {ideaScore! >= 40 && ideaScore! < 55 && 'Needs Focus — crowded or hard to monetize; narrow scope and prove value.'}
                        {ideaScore! < 40 && 'Early — high uncertainty or risk; validate problem and audience fit first.'}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-neutral-700/50 rounded-full h-2 mb-2 relative overflow-hidden z-0">
                        <div 
                          className={`h-2 rounded-full transition-[width] duration-1000 ease-out ${
                            ideaScore! > 85 ? 'bg-gradient-to-r from-emerald-400 to-green-300' :
                            ideaScore! > 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                            ideaScore! > 55 ? 'bg-gradient-to-r from-yellow-400 to-amber-400' :
                            ideaScore! > 40 ? 'bg-gradient-to-r from-orange-400 to-red-400' :
                            'bg-gradient-to-r from-red-500 to-pink-400'
                          }`}
                          style={{ width: `${ideaScore}%` }}
                        ></div>
                        
                        {/* Shimmer trail */}
                        <div 
                          className="absolute top-0 left-0 h-2 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-[shimmerTrail_1.5s_ease-out_forwards] pointer-events-none z-10"
                          style={{ 
                            animationDelay: '1.2s' // Start after progress bar fills
                          }}
                        ></div>
                      </div>
                      
                      {/* Removed secondary message to avoid duplicate copy; risk-adjusted subtext above replaces this. */}
                    </>
                  )}
                </div>
              )}

              
              {/* Connector phrase - only show when results are loaded */}
              <div className="text-center mb-4">
                <p className="text-sm text-neutral-400">
                  Here&apos;s what we discovered 👇
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-lg border border-blue-500/30 animate-[slideUpStagger_0.6s_ease-out_0s_forwards] opacity-0 flex flex-col min-h-[140px]">
                  <h3 className="text-xs sm:text-sm font-semibold text-blue-400 mb-2 sm:mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    <span>Problem</span>
                  </h3>
                  <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed break-words">{breakdownData.problem}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-lg border border-green-500/30 animate-[slideUpStagger_0.6s_ease-out_0.2s_forwards] opacity-0 flex flex-col min-h-[140px]">
                  <h3 className="text-xs sm:text-sm font-semibold text-green-400 mb-2 sm:mb-3 flex items-center gap-2">
                    <span>👥</span>
                    <span>Audience</span>
                  </h3>
                  <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed break-words">{breakdownData.audience}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-lg border border-purple-500/30 animate-[slideUpStagger_0.6s_ease-out_0.4s_forwards] opacity-0 flex flex-col min-h-[140px]">
                  <h3 className="text-xs sm:text-sm font-semibold text-purple-400 mb-2 sm:mb-3 flex items-center gap-2">
                    <span>💡</span>
                    <span>Solution</span>
                  </h3>
                  <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed break-words">{breakdownData.solution}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 rounded-lg border border-yellow-500/30 animate-[slideUpStagger_0.6s_ease-out_0.6s_forwards] opacity-0 flex flex-col min-h-[140px]">
                  <h3 className="text-xs sm:text-sm font-semibold text-yellow-400 mb-2 sm:mb-3 flex items-center gap-2">
                    <span>💰</span>
                    <span>Monetization</span>
                  </h3>
                  <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed break-words">{breakdownData.monetization}</p>
                </div>
              </div>
              
            </div>
          ) : null}
        </div>
      )}

      {/* Risk Assessment Section - New section between 4 cards and AI Analysis badge */}
      {(breakdownData?.risk_analysis || breakdownLoading) && (
        <div className="mt-12 mb-8">
          <div className="p-6 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl backdrop-blur-sm shadow-lg">
            {/* Risk Assessment Header */}
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <h3 className="text-xl font-semibold text-amber-200">Risk Assessment</h3>
                </div>
              </div>
              
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setShowRiskGuide(!showRiskGuide)}
                  className="flex items-center gap-2 text-sm text-amber-300/80 hover:text-amber-200 transition-colors"
                >
                  <span className="hidden sm:inline">
                    {showRiskGuide ? 'Hide guide' : 'What do these mean?'}
                  </span>
                  <span className="sm:hidden">
                    {showRiskGuide ? 'Hide' : 'Guide'}
                  </span>
                  {showRiskGuide ? (
                    <span className="text-xs">▲</span>
                  ) : (
                    <span className="text-xs">▼</span>
                  )}
                </button>
              </div>
              
              {/* Expandable guide */}
              {showRiskGuide && (
                <div className="mb-6 p-4 bg-neutral-800/50 rounded-lg border border-neutral-600/30">
                  <p className="text-sm text-neutral-300 mb-4">
                    We evaluate your idea across 4 key dimensions:
                  </p>
                  
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="font-medium text-amber-200 flex items-center gap-2">
                        <span>📊</span>
                        <span>Market Timing</span>
                      </div>
                      <div className="text-neutral-400 ml-6">
                        Is now the right time for this idea?
                      </div>
                      <div className="text-xs text-neutral-500 ml-6">
                        Lower = Better timing
                      </div>
                    </div>
                    
                    {/* Visual separator */}
                    <div className="border-t border-neutral-600/30 pt-4">
                      <div className="font-medium text-amber-200 flex items-center gap-2">
                        <span>⚔️</span>
                        <span>Competition</span>
                      </div>
                      <div className="text-neutral-400 ml-6">
                        How crowded is the market?
                      </div>
                      <div className="text-xs text-neutral-500 ml-6">
                        Lower = Less competition
                      </div>
                    </div>
                    
                    {/* Visual separator */}
                    <div className="border-t border-neutral-600/30 pt-4">
                      <div className="font-medium text-amber-200 flex items-center gap-2">
                        <span>💼</span>
                        <span>Business Viability</span>
                      </div>
                      <div className="text-neutral-400 ml-6">
                        How hard is it to monetize?
                      </div>
                      <div className="text-xs text-neutral-500 ml-6">
                        Lower = Easier to make money
                      </div>
                    </div>
                    
                    {/* Visual separator */}
                    <div className="border-t border-neutral-600/30 pt-4">
                      <div className="font-medium text-amber-200 flex items-center gap-2">
                        <span>📊</span>
                        <span>Execution</span>
                      </div>
                      <div className="text-neutral-400 ml-6">
                        How difficult is it to build?
                      </div>
                      <div className="text-xs text-neutral-500 ml-6">
                        Lower = Easier to execute
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-neutral-600/30 text-xs text-neutral-400">
                    <div className="font-medium text-neutral-300 mb-2">Overall Risk: Weighted average</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Competition:</span>
                        <span>35%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Viability:</span>
                        <span>25%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timing:</span>
                        <span>20%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Execution:</span>
                        <span>20%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {breakdownLoading ? (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-6 h-6 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></div>
                    <span className="text-sm text-amber-300">Analyzing risks...</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-amber-800/30 rounded animate-pulse"></div>
                    <div className="h-4 bg-amber-800/30 rounded w-3/4 mx-auto animate-pulse"></div>
                  </div>
                </div>
              ) : (
                /* Overall Risk Score */
                <div className="mb-6 text-center">
                  <div className="text-3xl font-bold text-amber-300 mb-2">
                    {breakdownData?.risk_analysis?.overall_score}/10
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    breakdownData?.risk_analysis?.risk_level === 'Low' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
                    breakdownData?.risk_analysis?.risk_level === 'Medium' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                    breakdownData?.risk_analysis?.risk_level === 'High' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                    'bg-neutral-500/15 text-neutral-300 border border-neutral-500/30'
                  }`}>
                    {breakdownData?.risk_analysis?.risk_level} Risk
                  </div>
                </div>
              )}
            </div>

            {/* Risk Category Bars */}
            {breakdownLoading ? (
              <div className="space-y-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-amber-800/30 rounded w-32 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      <div className="h-4 bg-amber-800/30 rounded w-12 animate-pulse" style={{ animationDuration: '2s' }}></div>
                    </div>
                    <div className="w-full bg-neutral-700/50 rounded-full h-2">
                      <div className="bg-amber-800/30 h-2 rounded-full animate-pulse" style={{ width: `${Math.random() * 60 + 20}%`, animationDuration: '2s' }}></div>
                    </div>
                    {/* Loading explanation placeholder */}
                    <div className="mt-2 p-3 bg-neutral-800/30 border border-neutral-600/20 rounded-lg">
                      <div className="space-y-1">
                        <div className="h-3 bg-neutral-700/50 rounded w-full animate-pulse" style={{ animationDuration: '2s' }}></div>
                        <div className="h-3 bg-neutral-700/50 rounded w-4/5 animate-pulse" style={{ animationDuration: '2s' }}></div>
                        <div className="h-3 bg-neutral-700/50 rounded w-3/5 animate-pulse" style={{ animationDuration: '2s' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {Object.entries(breakdownData?.risk_analysis?.category_scores || {}).map(([category, score]) => {
                const categoryNames = {
                  business_viability: '💼 Business Viability',
                  market_timing: '📅 Market Timing', 
                  competition_level: '⚔️ Competition',
                  execution_difficulty: '📊 Execution'
                }
                
                const scoreValue = score as number
                const percentage = scoreValue * 10
                
                // Color coding based on risk level
                const getRiskColors = (score: number) => {
                  if (score <= 5) {
                    // Lower Risk (0-5) → Yellow/Green tones
                    return 'from-yellow-400 to-green-400'
                  } else if (score <= 7) {
                    // Medium Risk (5-7) → Yellow/Orange tones  
                    return 'from-yellow-400 to-orange-400'
                  } else {
                    // Higher Risk (7-10) → Orange/Red tones
                    return 'from-orange-400 to-red-400'
                  }
                }
                
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-amber-200">
                        {categoryNames[category as keyof typeof categoryNames] || category}
                      </span>
                      <span className="text-sm text-amber-300">{scoreValue}/10</span>
                    </div>
                    <div className="w-full bg-neutral-700/50 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r ${getRiskColors(scoreValue)} h-2 rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    {/* Risk Explanation */}
                    {breakdownData?.risk_analysis?.explanations?.[category as keyof typeof breakdownData.risk_analysis.explanations] && (
                      <div className="mt-2 p-3 bg-neutral-800/30 border border-neutral-600/20 rounded-lg">
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {breakdownData.risk_analysis.explanations[category as keyof typeof breakdownData.risk_analysis.explanations]}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            )}

            {/* Top 3 Critical Risks - Blurred Teaser */}
            {!breakdownLoading && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-amber-200 mb-4 flex items-center justify-center gap-2">
                <span>🚨</span>
                <span>Top 3 Critical Risks</span>
              </h4>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 w-full">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative">
                    <div className="p-3 sm:p-4 bg-neutral-800/50 border border-neutral-600/30 rounded-lg blur-sm">
                      <div className="space-y-2">
                        <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <div className="h-5 bg-red-500/20 rounded w-16"></div>
                          <div className="h-5 bg-orange-500/20 rounded w-20"></div>
                        </div>
                        <div className="h-3 bg-neutral-700 rounded w-full"></div>
                        <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-neutral-900/80 rounded-full p-2">
                        <span className="text-2xl">🔒</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Small Contextual CTA */}
            <div className="text-center">
              <p className="text-sm text-neutral-400 mb-3">
                💡 This is just the beginning.
              </p>
              <button 
                onClick={scrollToCompetitorCTA}
                className="text-sm text-amber-300 hover:text-amber-100 underline underline-offset-2 hover:underline-offset-4 transition-all duration-200 group"
              >
                <span className="group-hover:translate-x-0.5 transition-transform duration-200 inline-block">
                  See everything included →
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Section - COMMENTED OUT FOR DEMO */}
      {/* {(breakdownData || breakdownLoading) && !isBreakdownVague && (
        <>
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-full border border-indigo-500/30 text-sm text-indigo-300">
              <span>✨</span>
              <span>{breakdownData?.ai_insights ? 'AI Analysis Complete' : 'AI Analysis in Progress'}</span>
              <span>✨</span>
            </div>
          </div>
          
          <div className="mt-4 p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl backdrop-blur-sm shadow-lg">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-2xl">🧠</span>
                <h3 className="text-xl font-semibold text-white">AI Insights</h3>
              </div>
              {breakdownData?.ai_insights ? (
                <div className="text-sm text-neutral-300 leading-relaxed max-w-2xl mx-auto">
                  {breakdownData.ai_insights.ai_verdict}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-neutral-400">Generating insights...</span>
                </div>
              )}
            </div>
            
            {breakdownData?.ai_insights ? (
              <div className="space-y-6">
                {breakdownData.ai_insights.recommendation && (
                <div className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl border-2 border-purple-400/40 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <span className="text-lg">📋</span>
                    </div>
                    <h4 className="text-lg font-semibold text-purple-200">Action Plan</h4>
                  </div>
                  <div className="text-base text-neutral-200 leading-relaxed">
                    {breakdownData.ai_insights.recommendation?.split('Step ').map((step, index) => {
                      if (index === 0) return step;
                      const stepText = step.replace(new RegExp('^\\d+:\\s*'), '');
                      return (
                        <div key={index} className="mt-3 flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-semibold text-purple-300">
                            {index}
                          </div>
                          <div className="flex-1">{stepText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {breakdownData.ai_insights.strengths && breakdownData.ai_insights.strengths.length > 0 && (
                  <div className="p-4 bg-green-900/20 rounded-lg border border-green-400/30">
                    <h4 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                      <span>Strengths</span>
                      <span className="text-xs">💪</span>
                    </h4>
                    <ul className="space-y-2">
                      {breakdownData.ai_insights.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                          <span className="text-green-400 mt-1 flex-shrink-0">•</span>
                          <span className="leading-relaxed">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {breakdownData.ai_insights.challenges && breakdownData.ai_insights.challenges.length > 0 && (
                  <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-400/30">
                    <h4 className="text-sm font-semibold text-yellow-300 mb-3 flex items-center gap-2">
                      <span>Challenges</span>
                      <span className="text-xs">⚠️</span>
                    </h4>
                    <ul className="space-y-2">
                      {breakdownData.ai_insights.challenges.map((challenge, index) => (
                        <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                          <span className="text-yellow-400 mt-1 flex-shrink-0">•</span>
                          <span className="leading-relaxed">{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <div className="w-6 h-6 bg-purple-400/30 rounded animate-pulse"></div>
                    </div>
                    <div className="flex-1">
                      <div className="h-4 bg-purple-400/30 rounded w-24 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-full animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-3/4 mt-2 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                  <div className="p-4 bg-green-900/20 rounded-lg border border-green-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-green-400/30 rounded animate-pulse"></div>
                      <div className="h-4 bg-green-400/30 rounded w-16 animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-neutral-600/50 rounded animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-4/5 animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-2/3 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-400/30">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-yellow-400/30 rounded animate-pulse"></div>
                      <div className="h-4 bg-yellow-400/30 rounded w-20 animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-neutral-600/50 rounded animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-neutral-600/50 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )} */}

      {/* Competitor Landscape Section - Now positioned outside results container for better mobile layout */}
      {(breakdownLoading || competitorData || competitorError || showVagueIdeaMessage) && (
        <div className="mt-6 p-6 bg-neutral-800/30 border border-neutral-600/50 rounded-xl backdrop-blur-sm">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-neutral-300 mb-2">
              Competitor Landscape 🔒
            </h3>
            {breakdownLoading ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-400">Analyzing competitor landscape...</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            ) : competitorError ? (
              <p className="text-sm text-red-400">Failed to analyze competitors. Showing sample data.</p>
            ) : showVagueIdeaMessage ? (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-400 mb-2">💡 Try describing what your idea does or who it helps — then we&apos;ll find competitors for you.</p>
              </div>
            ) : competitorData ? (
              <>
                <p className="text-sm text-neutral-400">We found {competitorData.count} similar players in this space.</p>
                {Array.isArray(competitorData.categories) && competitorData.categories.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500 mb-1">AI mapped your concept across these industries 🚀</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {competitorData.categories.slice(0, 4).map((cat: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wide bg-neutral-800/60 border border-neutral-700 text-neutral-300">
                          {cat.split(/\s+/).slice(0, 3).join(' ')}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 italic">These categories help frame your idea&apos;s real-world potential.</p>
                  </div>
                )}
                <p className="text-sm text-neutral-500">Create a free account to see detailed competitor insights.</p>
              </>
            ) : (
              <p className="text-sm text-neutral-400">We found 3 similar players in this space.</p>
            )}
          </div>

          {/* Competitor cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 w-full">
            {breakdownLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-neutral-800/50 border border-neutral-600/30 rounded-lg">
                  <div className="space-y-2">
                    <div className="h-4 bg-neutral-700 rounded shimmer animate-pulse"></div>
                    <div className="h-3 bg-neutral-700 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-neutral-700 rounded w-1/2 animate-pulse"></div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <div className="text-xs text-neutral-500">Analyzing...</div>
                    </div>
                  </div>
                </div>
              ))
            ) : competitorData ? (
              Array.from({ length: Math.min(3, Math.max(competitorData.count || 3, 3)) }).map((_, i: number) => (
                <div key={i} className="relative">
                  <div className="p-4 bg-neutral-800/50 border border-neutral-600/30 rounded-lg blur-sm">
                    <div className="space-y-2">
                      <div className="h-4 bg-neutral-700 rounded"></div>
                      <p className="text-xs text-neutral-400">{(competitorData.categories && competitorData.categories[i % (competitorData.categories.length || 1)]) || 'Category'}</p>
                      <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
                      <div className="h-3 bg-neutral-700 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-neutral-900/80 rounded-full p-2">
                      <span className="text-2xl">🔒</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="relative">
                  <div className="p-4 bg-neutral-800/50 border border-neutral-600/30 rounded-lg blur-sm">
                    <div className="space-y-2">
                      <div className="h-4 bg-neutral-700 rounded"></div>
                      <div className="h-3 bg-neutral-700 rounded w-3/4"></div>
                      <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-neutral-900/80 rounded-full p-2">
                      <span className="text-2xl">🔒</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Primary CTA */}
          <div 
            id="competitor-cta" 
            className={`text-center mt-10 pb-4 transition-all duration-500 ${
              shouldAnimateCTA ? 'animate-pulse scale-105' : ''
            }`}
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                🔓 Unlock Complete Startup Intelligence
              </h3>
              <p className="text-neutral-300 mb-6">
                Everything you need to validate and launch:
              </p>
              
              {/* Benefits list */}
              <div className="text-center max-w-md mx-auto space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-300">
                  <span className="text-green-400">✓</span>
                  <span>Detailed risk analysis + mitigation plans</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-300">
                  <span className="text-green-400">✓</span>
                  <span>Full competitor positioning & pricing</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-300">
                  <span className="text-green-400">✓</span>
                  <span>90-day MVP roadmap with milestones</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-300">
                  <span className="text-green-400">✓</span>
                  <span>Export to Notion, PDF, Trello</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-300">
                  <span className="text-green-400">✓</span>
                  <span>Save & compare unlimited ideas</span>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg text-lg"
            >
              Unlock Full Analysis
            </button>
          </div>
        </div>
      )}

      {/* Extra spacing to prevent overlap with next section */}
      {isExpanded && (competitorData || competitorError) && (
        <div className="h-12"></div>
      )}

      {/* Refinement Prompt Modal */}
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
    </div>
  )
}
