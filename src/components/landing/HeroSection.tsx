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

    setIsLoading(true)
    setError(null)
    setResult(null)
    setProgress(0)

    try {
      const response = await fetch('/api/refine-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idea: idea.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.idea)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
      setProgress(100)
      setTimeout(() => setProgress(0), 600)
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
          {/* Initial state - Inline dual display with refined preview below */}
          {!isLoading && !result && (
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
              
              {/* Refined preview below the textarea */}
              {idea.trim() && (
                <div className="mt-2 p-4 bg-neutral-800/30 border border-neutral-600/50 rounded-xl transition-all duration-500 ease-out opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards] backdrop-blur-sm">
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
              )}
              
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
            </div>
          )}

          {/* Results state - Full width results with edit option */}
          {(isLoading || result) && (
            <div className="w-full">
              <div className="p-8 bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
                {/* Header with Edit option */}
                <div className="relative mb-8">
                  {/* Edit button - Top left */}
                  {result && (
                    <button
                      onClick={() => {
                        setResult(null)
                        setError(null)
                        // Keep the idea text so user can edit it
                        requestAnimationFrame(() => textareaRef.current?.focus())
                      }}
                      className="absolute top-0 left-0 px-4 py-2 bg-neutral-700/50 hover:bg-neutral-700 text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 text-sm font-medium border border-neutral-600 flex items-center gap-2"
                    >
                      ← Edit
                    </button>
                  )}
                  
                  {/* Title - Top center */}
                  <h2 className="text-3xl font-bold text-white animate-in fade-in duration-700 text-center">
                    Let&apos;s Break Down Your Idea
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-100 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-blue-900/40 hover:border-blue-500/70">
                    <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-3">
                      🎯 Problem
                      {isLoading && <div className="typing-dots text-blue-300"><span></span><span></span><span></span></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700/80 rounded shimmer"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-4/5"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-3/5"></div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-300 leading-relaxed text-lg">{result?.problem}</p>
                        <button
                          onClick={() => handleCopy('problem', result?.problem)}
                          className="text-xs text-blue-300/80 hover:text-blue-200 border border-neutral-700 px-2 py-1 rounded-md"
                          title={copied.problem ? 'Copied!' : 'Copy'}
                        >
                          {copied.problem ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-200 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-green-900/40 hover:border-green-500/70">
                    <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-3">
                      👥 Audience
                      {isLoading && <div className="typing-dots text-green-300"><span></span><span></span><span></span></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700/80 rounded shimmer"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-3/4"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-2/3"></div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-300 leading-relaxed text-lg">{result?.audience}</p>
                        <button
                          onClick={() => handleCopy('audience', result?.audience)}
                          className="text-xs text-green-300/80 hover:text-green-200 border border-neutral-700 px-2 py-1 rounded-md"
                          title={copied.audience ? 'Copied!' : 'Copy'}
                        >
                          {copied.audience ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-300 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-purple-900/40 hover:border-purple-500/70">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-3">
                      💡 Solution
                      {isLoading && <div className="typing-dots text-purple-300"><span></span><span></span><span></span></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700/80 rounded shimmer"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-5/6"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-4/5"></div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-300 leading-relaxed text-lg">{result?.solution}</p>
                        <button
                          onClick={() => handleCopy('solution', result?.solution)}
                          className="text-xs text-purple-300/80 hover:text-purple-200 border border-neutral-700 px-2 py-1 rounded-md"
                          title={copied.solution ? 'Copied!' : 'Copy'}
                        >
                          {copied.solution ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-400 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-yellow-900/40 hover:border-yellow-500/70">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-3">
                      💰 Monetization
                      {isLoading && <div className="typing-dots text-yellow-300"><span></span><span></span><span></span></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700/80 rounded shimmer"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-4/6"></div>
                        <div className="h-5 bg-neutral-700/80 rounded shimmer w-3/5"></div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-300 leading-relaxed text-lg">{result?.monetization}</p>
                        <button
                          onClick={() => handleCopy('monetization', result?.monetization)}
                          className="text-xs text-yellow-300/80 hover:text-yellow-200 border border-neutral-700 px-2 py-1 rounded-md"
                          title={copied.monetization ? 'Copied!' : 'Copy'}
                        >
                          {copied.monetization ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Only show button and subtext when not showing results */}
        {!result && (
          <>
            <div className="mt-6 flex flex-col items-center">
              <button
                type="button"
                onClick={handleRefineIdea}
                disabled={isLoading || !idea.trim()}
                className={`inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md btn-sweep ${pulseCTA ? 'pulse-once' : ''}`}
                style={{ backgroundColor: '#667eea' }}
                ref={ctaRef}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Analyzing…
                  </>
                ) : (
                  'Refine Idea 🚀'
                )}
              </button>
              {(isLoading || progress > 0) && (
                <div className="w-full sm:w-[420px] mt-3 progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-xl animate-in slide-in-from-top-2 duration-300">
                <p className="text-red-400 text-center">{error}</p>
              </div>
            )}

            <p className="mt-4 text-xs sm:text-sm text-gray-400 text-center">
              ⏱️ Results in 30 seconds  🤖 AI-Powered Analysis
            </p>
          </>
        )}
      </div>
    </section>
  );
}


