'use client'

import { useState } from 'react'

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

  const handleRefineIdea = async () => {
    if (!idea.trim()) {
      setError('Please enter your idea first')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

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
    }
  }

  return (
    <section className="w-full min-h-screen bg-black text-white flex items-start sm:items-center justify-center py-16">
      {/* TEST: This should appear if changes are working */}
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Turn your startup idea into a clear roadmap in minutes.
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Paste your idea. Get problem, audience, solution, and monetization instantly — powered by AI.
          </p>
        </div>

        <div className="mt-10">
          {/* Initial state - Full width textarea */}
          {!isLoading && !result && (
            <div className="w-full">
              <label htmlFor="idea" className="sr-only">Describe the idea</label>
              <textarea
                id="idea"
                rows={10}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                className="w-full resize-none rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 outline-none p-6 text-base text-white placeholder:text-neutral-500 shadow-lg transition-all duration-300 hover:border-neutral-700 hover:shadow-xl"
                placeholder="Describe the idea... e.g., An app that connects local chefs with nearby customers for home‑cooked meals, with delivery and subscription options."
              />
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
                      {isLoading && <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700 rounded animate-pulse"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-4/5"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-3/5"></div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-lg">{result?.problem}</p>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-200 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-green-900/40 hover:border-green-500/70">
                    <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-3">
                      👥 Audience
                      {isLoading && <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700 rounded animate-pulse"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-3/4"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-2/3"></div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-lg">{result?.audience}</p>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-300 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-purple-900/40 hover:border-purple-500/70">
                    <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-3">
                      💡 Solution
                      {isLoading && <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700 rounded animate-pulse"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-5/6"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-4/5"></div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-lg">{result?.solution}</p>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-800/50 backdrop-blur-sm rounded-2xl transition-all duration-150 animate-in slide-in-from-bottom-4 duration-500 delay-400 hover:scale-[1.02] hover:shadow-xl border border-neutral-700/50 hover:bg-yellow-900/40 hover:border-yellow-500/70">
                    <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-3">
                      💰 Monetization
                      {isLoading && <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>}
                    </h3>
                    {isLoading ? (
                      <div className="space-y-3">
                        <div className="h-5 bg-neutral-700 rounded animate-pulse"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-4/6"></div>
                        <div className="h-5 bg-neutral-700 rounded animate-pulse w-3/5"></div>
                      </div>
                    ) : (
                      <p className="text-gray-300 leading-relaxed text-lg">{result?.monetization}</p>
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
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleRefineIdea}
                disabled={isLoading || !idea.trim()}
                className="inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
                style={{ backgroundColor: '#667eea' }}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Refine Idea 🚀'
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
          </>
        )}
      </div>
    </section>
  );
}


