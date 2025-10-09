'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface IdeaBreakdown {
  id: string
  idea_text: string
  problem: string
  audience: string
  solution: string
  monetization: string
  created_at: string
}

interface InteractiveDemoProps {
  onReset: () => void
}

export default function InteractiveDemo({ onReset }: InteractiveDemoProps) {
  // Idea state
  const [idea, setIdea] = useState('')
  
  // Guest session management
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null)
  
  // Animated placeholder state
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0)
  const [isPlaceholderAnimating, setIsPlaceholderAnimating] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Initialize guest session on component mount
  useEffect(() => {
    const initializeGuestSession = () => {
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
  const [refinedPreview, setRefinedPreview] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isRefinementCollapsing, setIsRefinementCollapsing] = useState(false)
  const previewTimer = useRef<number | null>(null)
  const lastRefinedIdea = useRef<string>('')

  // Expansion state for breakdown results
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [breakdownData, setBreakdownData] = useState<IdeaBreakdown | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [revealedCards, setRevealedCards] = useState<number[]>([])
  const [currentSubtext, setCurrentSubtext] = useState(0)
  const [isResetting, setIsResetting] = useState(false)
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null)
  
  // Competitor analysis state
  const [competitorData, setCompetitorData] = useState<{ analysisId: string; count: number; categories: string[]; blurred: boolean } | null>(null)
  const [competitorLoading, setCompetitorLoading] = useState(false)
  const [competitorError, setCompetitorError] = useState<string | null>(null)
  const [showVagueIdeaMessage, setShowVagueIdeaMessage] = useState(false)
  const [isBreakdownVague, setIsBreakdownVague] = useState(false)
  const [ideaScore, setIdeaScore] = useState<number | null>(null)
  const [isCalculatingScore, setIsCalculatingScore] = useState(false)

  // Simple static number display
  const AnimatedNumber = ({ value }: { value: number }) => {
    return <span>{value}</span>
  }

  // Function to compute idea strength score based on refinement output
  const computeIdeaScore = (refinedData: IdeaBreakdown) => {
    const fields = [
      refinedData.problem,
      refinedData.audience,
      refinedData.solution,
      refinedData.monetization
    ];
    const textLengths = fields.map(f => f.length);
    const avgLength = textLengths.reduce((a, b) => a + b, 0) / fields.length;

    const clarity = Math.min(1, avgLength / 180); // was 120 → now stricter
    const completeness = fields.filter(f => f.trim().length > 60).length / 4; // require richer text
    const balance = 1 - Math.min(1, Math.abs(textLengths[0] - textLengths[2]) / 300);

    // Weighted baseline with stronger penalty for short or uneven text
    const weights = { problem: 0.35, audience: 0.25, solution: 0.25, monetization: 0.15 };
    const weightedSum = fields.reduce(
      (acc, f, i) => acc + (f.length / 200) * Object.values(weights)[i],
      0
    );

    // Raw score before smoothing
    const rawScore = (clarity * 0.4 + completeness * 0.3 + balance * 0.2 + weightedSum * 0.1) * 100;

    // Gaussian-like normalization — more realistic spread
    const normalized = 45 + (rawScore - 50) * 0.8 + (Math.random() - 0.5) * 10;

    return Math.round(Math.min(95, Math.max(30, normalized)));
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

  // Debounce refine-preview calls to /api/refine-text
  useEffect(() => {
    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current)
      previewTimer.current = null
    }

    if (!idea.trim()) {
      setRefinedPreview('')
      setPreviewError(null)
      setPreviewLoading(false)
      lastRefinedIdea.current = ''
      return
    }

    // Count words in the input
    const wordCount = idea.trim().split(/\s+/).filter(word => word.length > 0).length
    
    // Check if input ends with a word (not mid-sentence punctuation)
    const endsWithWord = idea.trim().match(/\w$/) !== null
    
    // Don't refine if less than 6 words or doesn't end with a word
    if (wordCount < 6 || !endsWithWord) {
      // If we had content before and now we don't, trigger collapse animation
      if (refinedPreview || previewLoading) {
        setIsRefinementCollapsing(true)
        setTimeout(() => {
          setRefinedPreview('')
          setPreviewError(null)
          setPreviewLoading(false)
          setIsRefinementCollapsing(false)
        }, 300) // Match collapse animation duration
      } else {
        setRefinedPreview('')
        setPreviewError(null)
        setPreviewLoading(false)
      }
      return
    }

    // Skip refinement if the idea is the same as what we last refined
    // Also skip if the idea matches the current refined preview (user clicked "Use this")
    if (idea.trim() === lastRefinedIdea.current || idea.trim() === refinedPreview) {
      return
    }

    setPreviewError(null)
    
    previewTimer.current = window.setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch('/api/refine-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea }),
        })
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to refine')
        }
        setRefinedPreview(data.refinedIdea || '')
        lastRefinedIdea.current = idea.trim()
      } catch (e: unknown) {
        setPreviewError(e instanceof Error ? e.message : 'Unable to refine right now')
        setRefinedPreview('')
      } finally {
        setPreviewLoading(false)
      }
    }, 900) // 900ms debounce - natural pause detection

    return () => {
      if (previewTimer.current) {
        window.clearTimeout(previewTimer.current)
        previewTimer.current = null
      }
    }
  }, [idea, refinedPreview, previewLoading])

  const handleRefineIdea = async () => {
    if (!idea.trim() || isResetting) {
      console.log('🚫 handleRefineIdea blocked:', { idea: idea.trim(), isResetting })
      return
    }

    console.log('🚀 handleRefineIdea running - this should not happen during reset!')

    // Use the refined preview if available, otherwise use the raw idea
    const ideaToAnalyze = refinedPreview.trim() || idea.trim()

    setBreakdownLoading(true)
    setIsExpanded(true)
    
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
        
        // Calculate idea strength score with micro-loading
        setIsCalculatingScore(true)
        const score = computeIdeaScore(data.idea)
        
        // Show "AI thinking" for 1.5 seconds before revealing score
        setTimeout(() => {
          setIdeaScore(score)
          setIsCalculatingScore(false)
        }, 1500)
        
        console.log(`Breakdown analysis completed`, { isVague, score })
        
        // Start competitor analysis with refined data
        if (!isVague) {
          const competitorPayload = `${data.idea.solution}. Target audience: ${data.idea.audience}.`
          fetchCompetitorAnalysis(competitorPayload, startTime)
        }
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
    } finally {
      setBreakdownLoading(false)
    }
  }

  // Competitor analysis API call
  const fetchCompetitorAnalysis = async (idea: string, startTime: number) => {
    setCompetitorLoading(true)
    setCompetitorError(null)
    
    try {
      const response = await fetch('/api/analyze-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      })
      
      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze competitors')
      }
      
      // Handle skipCompetitors response
      if (data.data.skipCompetitors) {
        setCompetitorData(null)
        setShowVagueIdeaMessage(true)
        return
      }
      
      // Teaser-only payload: { analysisId, count, categories, blurred }
      setCompetitorData(data.data)
      
      // Calculate total analysis duration when competitor analysis completes
      const totalDuration = Date.now() - startTime
      setAnalysisDuration(totalDuration)
      console.log(`Total analysis completed in ${totalDuration}ms (${Math.round(totalDuration / 1000)} seconds)`)
    } catch (error) {
      console.error('Competitor analysis error:', error)
      setCompetitorError(error instanceof Error ? error.message : 'Failed to analyze competitors')
    } finally {
      setCompetitorLoading(false)
    }
  }

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

  const handleReset = () => {
    // Simple reset - let Framer Motion handle the smooth transition
    setIsExpanded(false)
    setIsCollapsing(false)
    
    // Clear all states immediately
    setBreakdownData(null)
    setCompetitorData(null)
    setRefinedPreview('')
    setPreviewError(null)
    setPreviewLoading(false)
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


  return (
    <div className="w-full">
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
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-semibold text-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                Analysis Complete!
              </p>
              <p className="text-neutral-300 text-sm mb-2">Your business insights are ready.</p>
              
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
              
              <button
                onClick={handleReset}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 underline transition-all duration-300 hover:scale-105"
              >
                💡 Try a New Idea
              </button>
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
              
              <button
                onClick={handleReset}
                className="mt-4 text-sm text-amber-400 hover:text-amber-300 underline transition-all duration-300 hover:scale-105"
              >
                💡 Try a New Idea
              </button>
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
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && e.shiftKey === false)) {
                    e.preventDefault()
                    // Optional: Add keyboard shortcut for demo
                  }
                }}
                onPaste={handlePaste}
                ref={textareaRef}
                className={`w-full resize-none rounded-2xl border border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 outline-none p-6 text-base shadow-lg transition-all duration-700 hover:border-neutral-700 hover:shadow-xl relative ${
                  idea.trim() ? 'bg-neutral-900 text-white' : 'bg-transparent text-transparent'
                }`}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refined preview section - only show when there's content, loading, or collapsing */}
      {idea.trim() && (previewLoading || previewError || refinedPreview || isRefinementCollapsing) && (
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
                <div className="transition-all duration-300 ease-out animate-[fadeInLeft_0.3s_ease-out_forwards] cursor-pointer hover:bg-neutral-800/30 rounded-lg p-3 -m-3" onClick={() => setIdea(refinedPreview)}>
                  <p className="text-neutral-300 leading-relaxed italic">&ldquo;{refinedPreview}&rdquo;</p>
                  <p className="text-neutral-400 text-xs mt-2">Click to use this refined version</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Show button and subtext - only when not expanded */}
      {!isExpanded && (
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={handleRefineIdea}
            disabled={breakdownLoading || !idea.trim()}
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
        <div className={`mt-4 mb-8 p-6 bg-neutral-800/30 border border-neutral-600/50 rounded-xl backdrop-blur-sm transition-all duration-300 w-full max-w-none ${
          isCollapsing
            ? 'opacity-0 translate-y-2'
            : 'animate-[expandDown_0.6s_ease-out_forwards] opacity-0'
        }`}>
          {breakdownLoading ? (
            <div className="space-y-4">
              {/* Typing indicator with rotating subtext */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-sm text-neutral-400">Analyzing your idea</span>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mb-1 transition-opacity duration-300">
                  {breakdownLoading ? [
                    "Identifying key problems...",
                    "Defining your target audience...",
                    "Shaping a solution...",
                    "Exploring monetization models..."
                  ][currentSubtext] : "Preparing your business breakdown..."}
                </p>
                <p className="text-xs text-neutral-600">
                  This usually takes ~5–10 seconds
                </p>
              </div>
              
              {/* Skeleton cards with progressive reveal */}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { icon: "🎯", title: "Problem", color: "text-blue-400" },
                  { icon: "👥", title: "Audience", color: "text-green-400" },
                  { icon: "💡", title: "Solution", color: "text-purple-400" },
                  { icon: "💰", title: "Monetization", color: "text-yellow-400" }
                ].map((section, i) => {
                  const isRevealed = revealedCards.includes(i)
                  return (
                    <div 
                      key={i} 
                      className={`p-4 bg-neutral-700/30 rounded-lg transition-all duration-500 ${
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
                            <div className="h-3 bg-neutral-600 rounded shimmer animate-pulse"></div>
                            <div className="h-3 bg-neutral-600 rounded shimmer w-4/5 animate-pulse"></div>
                            <div className="h-3 bg-neutral-600 rounded shimmer w-3/5 animate-pulse"></div>
                            <div className="h-3 bg-neutral-600 rounded shimmer w-2/3 animate-pulse"></div>
                          </>
                        ) : (
                          <div className="h-12 bg-neutral-800/50 rounded"></div>
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
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-sm font-medium text-neutral-300">Assessing idea strength...</span>
                      <span className="text-lg animate-pulse">💭</span>
                    </div>
                  ) : (
                    // Score revealed state
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-sm font-medium text-neutral-300">💡 Idea Strength:</span>
                        <span className={`text-lg font-bold animate-[fadeInUp_0.5s_ease-out_forwards] ${
                          ideaScore! > 85 ? 'text-emerald-400' :
                          ideaScore! > 70 ? 'text-green-400' :
                          ideaScore! > 55 ? 'text-yellow-400' :
                          ideaScore! > 40 ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          <AnimatedNumber value={ideaScore!} />%
                        </span>
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
                      
                      <p className="text-xs text-neutral-400 animate-[fadeInUp_0.5s_ease-out_forwards]">
                        {ideaScore! > 85 
                          ? "🌟 Exceptional clarity and vision — this idea could stand out to investors."
                          : ideaScore! > 70 
                          ? "💼 Strong, well-rounded concept — solid foundation for an MVP or pitch deck."
                          : ideaScore! > 55 
                          ? "✍️ Good starting point — refine your problem and audience focus for sharper impact."
                          : "🧠 The idea feels a bit unclear — expand on what it solves and who it's for."
                        }
                      </p>
                    </>
                  )}
                </div>
              )}
              
              {/* Connector phrase - only show when results are loaded */}
              <div className="text-center mb-4">
                <p className="text-sm text-neutral-400">
                  Based on this refined idea, here&apos;s the breakdown 👇
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-neutral-700/30 rounded-lg animate-[slideUpStagger_0.6s_ease-out_0s_forwards] opacity-0">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">🎯 Problem</h3>
                  <p className="text-neutral-300 text-sm">{breakdownData.problem}</p>
                </div>
                <div className="p-4 bg-neutral-700/30 rounded-lg animate-[slideUpStagger_0.6s_ease-out_0.2s_forwards] opacity-0">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">👥 Audience</h3>
                  <p className="text-neutral-300 text-sm">{breakdownData.audience}</p>
                </div>
                <div className="p-4 bg-neutral-700/30 rounded-lg animate-[slideUpStagger_0.6s_ease-out_0.4s_forwards] opacity-0">
                  <h3 className="text-sm font-semibold text-purple-400 mb-2">💡 Solution</h3>
                  <p className="text-neutral-300 text-sm">{breakdownData.solution}</p>
                </div>
                <div className="p-4 bg-neutral-700/30 rounded-lg animate-[slideUpStagger_0.6s_ease-out_0.6s_forwards] opacity-0">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">💰 Monetization</h3>
                  <p className="text-neutral-300 text-sm">{breakdownData.monetization}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Competitor section INSIDE results container */}
          {(competitorLoading || competitorData || competitorError || showVagueIdeaMessage) && (
            <>
              {/* Section divider */}
              <div className="mt-6 pt-4 border-t border-neutral-600/30"></div>

              {/* Competitor Landscape Section */}
              <div className="mt-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">
                    Competitor Landscape 🔒
                  </h3>
                  {competitorLoading ? (
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 w-full max-w-none">
                  {competitorLoading ? (
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

                {/* Unlock button */}
                <div className="text-center mt-10 pb-4">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('open-login-modal'))}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                  >
                    🔓 See Full AI Insights
                  </button>
                  <p className="text-sm text-neutral-400 mt-3 max-w-2xl mx-auto leading-relaxed">
                    ✨ Unlock the full journey — discover real competitors, AI-identified opportunities, and get your personalized roadmap to turn this idea into reality.
                  </p>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {/* Extra spacing to prevent overlap with next section */}
      {isExpanded && (competitorLoading || competitorData || competitorError) && (
        <div className="h-12"></div>
      )}
    </div>
  )
}
