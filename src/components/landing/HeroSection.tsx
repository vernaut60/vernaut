'use client'

import { useEffect, useRef, useState } from 'react'

interface IdeaBreakdown {
  id: string
  idea_text: string
  problem: string
  audience: string
  solution: string
  monetization: string
  created_at: string
}

export default function HeroSection() {
  const [idea, setIdea] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<IdeaBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState({ problem: false, audience: false, solution: false, monetization: false })
  const [pulseCTA, setPulseCTA] = useState(false)

  // Debounced refine-preview (does not overwrite the textarea)
  const [refinedPreview, setRefinedPreview] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const previewTimer = useRef<number | null>(null)
  const lastRefinedIdea = useRef<string>('')
  
  // Expansion state for breakdown results
  const [isExpanded, setIsExpanded] = useState(false)
  const [breakdownData, setBreakdownData] = useState<IdeaBreakdown | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [revealedCards, setRevealedCards] = useState<number[]>([])
  const [currentSubtext, setCurrentSubtext] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const ctaRef = useRef<HTMLButtonElement | null>(null)

  const EXAMPLES = [
    'An AI assistant that helps freelancers create contracts and track client payments automatically.',
    'A platform for small e-commerce brands to analyze customer behavior and suggest product improvements.',
    'A mobile app that connects local chefs with nearby customers for home-cooked meal delivery.',
  ]

  const handleRefineIdea = async () => {
    if (!idea.trim()) {
      setError('Please enter your idea first')
      return
    }

    // Use the refined preview if available, otherwise use the raw idea
    const ideaToAnalyze = refinedPreview.trim() || idea.trim()
    
    setBreakdownLoading(true)
    setIsExpanded(true)
    setError(null)

    try {
      const response = await fetch('/api/refine-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea: ideaToAnalyze }),
      })

      const data = await response.json()

      if (data.success) {
        setBreakdownData(data.idea)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBreakdownLoading(false)
    }
  }

  // Simulate progress bar while loading (front-end only)
  useEffect(() => {
    if (!isLoading) return
    let current = 0
    setProgress(0)
    const interval = setInterval(() => {
      current = Math.min(85, current + Math.max(1, 6 - Math.floor(current / 15)))
      setProgress(current)
    }, 500)
    return () => clearInterval(interval)
  }, [isLoading])

  // ESC to return to edit mode from results
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && result) {
        setResult(null)
        setError(null)
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [result])

  const handleIdeaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 'Enter' && e.shiftKey === false)) {
      e.preventDefault()
      if (!isLoading) handleRefineIdea()
    }
  }

  const handlePaste = () => {
    setPulseCTA(true)
    setTimeout(() => setPulseCTA(false), 500)
  }

  const applyExample = (text: string) => {
    setIdea(text)
    setPulseCTA(true)
    setTimeout(() => setPulseCTA(false), 500)
  }

  const shuffleExample = () => {
    const next = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
    applyExample(next)
  }

  const handleCopy = async (field: keyof typeof copied, text?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [field]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [field]: false })), 1200)
    } catch {
      // no-op
    }
  }

  // Handle expansion of refined preview to show breakdown
  const handleExpandBreakdown = async () => {
    if (!refinedPreview.trim()) return

    setBreakdownLoading(true)
    setIsExpanded(true)

    try {
      const response = await fetch('/api/refine-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea: refinedPreview.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setBreakdownData(data.idea)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBreakdownLoading(false)
    }
  }

  const handleCollapseBreakdown = () => {
    setIsExpanded(false)
    setBreakdownData(null)
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

    // Skip refinement if the idea is the same as what we last refined
    // Also skip if the idea matches the current refined preview (user clicked "Use this")
    if (idea.trim() === lastRefinedIdea.current || idea.trim() === refinedPreview) {
      return
    }

    setPreviewLoading(true)
    setPreviewError(null)
    previewTimer.current = window.setTimeout(async () => {
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
    }, 700)

    return () => {
      if (previewTimer.current) {
        window.clearTimeout(previewTimer.current)
        previewTimer.current = null
      }
    }
  }, [idea, refinedPreview])

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
      const subtexts = [
        "Identifying key problems...",
        "Defining your target audience...",
        "Shaping a solution...",
        "Exploring monetization models..."
      ]
      
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

  return (
    <section className="w-full min-h-screen bg-black text-white flex items-start sm:items-center justify-center py-16 pt-24">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Turn your startup idea into a clear roadmap in minutes.
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Paste your idea. Get problem, audience, solution, and monetization instantly — powered by AI.
          </p>
        </div>

        <div className="mt-10">
          {/* Textarea with integrated refined preview inside */}
          <div className="w-full">
            <label htmlFor="idea" className="sr-only">Describe the idea</label>
            <textarea
              id="idea"
              rows={10}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={handleIdeaKeyDown}
              onPaste={handlePaste}
              ref={textareaRef}
              className="w-full resize-none rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 outline-none p-6 text-base text-white placeholder:text-neutral-500 shadow-lg transition-all duration-300 hover:border-neutral-700 hover:shadow-xl"
              placeholder="Describe the idea... e.g., An app that connects local chefs with nearby customers for home‑cooked meals, with delivery and subscription options."
            />
            
            {/* Refined preview section below textarea */}
            {idea.trim() && (
              <div className="mt-4">
                {/* Divider */}
                <div className="border-t border-neutral-700/50 mb-4"></div>
                
                {/* Refined preview section */}
                <div className="p-4 bg-neutral-800/30 border border-neutral-600/50 rounded-xl transition-all duration-500 ease-out opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards] backdrop-blur-sm">
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
                      <p className="text-neutral-300 leading-relaxed transition-all duration-500 ease-out animate-[fadeInLeft_0.5s_ease-out_forwards] italic">&ldquo;{refinedPreview}&rdquo;</p>
                    ) : (
                      <p className="text-neutral-500 text-sm">Your refined idea will appear here...</p>
                    )}
                  </div>
                  {refinedPreview && (
                    <div className="mt-3 flex gap-2 transition-all duration-500 ease-out animate-[fadeInUp_0.5s_ease-out_0.2s_forwards] opacity-0">
                      <button
                        type="button"
                        onClick={() => setIdea(refinedPreview)}
                        className="px-3 py-1.5 rounded-md text-xs border border-neutral-500/60 text-neutral-300 hover:bg-neutral-700/50 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        Use this
                      </button>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(refinedPreview)}
                        className="px-3 py-1.5 rounded-md text-xs border border-neutral-500/60 text-neutral-300 hover:bg-neutral-700/50 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Examples and helper text - fixed position below textarea */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.slice(0, 3).map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyExample(ex)}
                    className="px-3 py-1.5 rounded-full bg-neutral-800/70 text-neutral-200 text-xs border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 transition-colors"
                  >
                    {ex.length > 42 ? ex.slice(0, 42) + '…' : ex}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={shuffleExample}
                  className="px-3 py-1.5 rounded-full text-white text-xs border border-neutral-700 hover:scale-105 active:scale-95 transition-transform"
                  style={{ backgroundColor: '#667eea' }}
                >
                  Show another example
                </button>
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-3">
                <span>A short, simple description works best. Just a sentence or two is enough — we&apos;ll do the rest.</span>
                <span className={idea.length > 900 ? 'text-amber-400' : ''}>{idea.length}/1000</span>
              </div>
            </div>
            
            {/* Breakdown results section below textarea */}
            {isExpanded && (
              <div className="mt-4 p-6 bg-neutral-800/30 border border-neutral-600/50 rounded-xl backdrop-blur-sm animate-[expandDown_0.6s_ease-out_forwards] opacity-0">
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
                    {/* Connector phrase - only show when results are loaded */}
                    <div className="text-center mb-4">
                      <p className="text-sm text-neutral-400">
                        Based on this refined idea, here&apos;s the breakdown 👇
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="p-4 bg-neutral-700/30 rounded-lg animate-[fadeInUp_0.4s_ease-out_0s_forwards] opacity-0">
                        <h3 className="text-sm font-semibold text-blue-400 mb-2">🎯 Problem</h3>
                        <p className="text-neutral-300 text-sm">{breakdownData.problem}</p>
                      </div>
                      <div className="p-4 bg-neutral-700/30 rounded-lg animate-[fadeInUp_0.4s_ease-out_0.2s_forwards] opacity-0">
                        <h3 className="text-sm font-semibold text-green-400 mb-2">👥 Audience</h3>
                        <p className="text-neutral-300 text-sm">{breakdownData.audience}</p>
                      </div>
                      <div className="p-4 bg-neutral-700/30 rounded-lg animate-[fadeInUp_0.4s_ease-out_0.4s_forwards] opacity-0">
                        <h3 className="text-sm font-semibold text-purple-400 mb-2">💡 Solution</h3>
                        <p className="text-neutral-300 text-sm">{breakdownData.solution}</p>
                      </div>
                      <div className="p-4 bg-neutral-700/30 rounded-lg animate-[fadeInUp_0.4s_ease-out_0.6s_forwards] opacity-0">
                        <h3 className="text-sm font-semibold text-yellow-400 mb-2">💰 Monetization</h3>
                        <p className="text-neutral-300 text-sm">{breakdownData.monetization}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

        </div>

        {/* Show button and subtext */}
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={handleRefineIdea}
            disabled={breakdownLoading || !idea.trim()}
            className={`inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md btn-sweep ${pulseCTA ? 'pulse-once' : ''}`}
            style={{ backgroundColor: '#667eea' }}
            ref={ctaRef}
          >
            {breakdownLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Analyzing…
              </>
            ) : (
              'Break It Down 🚀'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-xl animate-in slide-in-from-top-2 duration-300">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        <p className="mt-4 text-xs sm:text-sm text-gray-400 text-center">
          ⏱️ Results in 30 seconds  🤖 AI-Powered Analysis
        </p>
      </div>
    </section>
  );
}


