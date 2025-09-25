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
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="w-full min-h-screen bg-black text-white flex items-start sm:items-center justify-center py-16">
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
          <div>
            <label htmlFor="idea" className="sr-only">Describe the idea</label>
            <textarea
              id="idea"
              rows={8}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 outline-none p-5 text-base text-white placeholder:text-neutral-500 shadow-lg disabled:opacity-50"
              placeholder="Describe the idea... e.g., An app that connects local chefs with nearby customers for home‑cooked meals, with delivery and subscription options."
            />
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleRefineIdea}
              disabled={isLoading || !idea.trim()}
              className="inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none active:scale-95 hover:scale-105 transition-transform duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: '#667eea' }}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Refine Idea 🚀'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-xl">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}

          <p className="mt-4 text-xs sm:text-sm text-gray-400 text-center">
            ⏱️ Results in 30 seconds, 🛡️ 100% Private & Secure, 🤖 AI-Powered Analysis
          </p>

          {result && (
            <div className="mt-12 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <h2 className="text-2xl font-bold text-center mb-8 text-white">
                Your Idea Breakdown
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 bg-neutral-800 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">🎯 Problem</h3>
                  <p className="text-gray-300">{result.problem}</p>
                </div>

                <div className="p-4 bg-neutral-800 rounded-xl">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">👥 Audience</h3>
                  <p className="text-gray-300">{result.audience}</p>
                </div>

                <div className="p-4 bg-neutral-800 rounded-xl">
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">💡 Solution</h3>
                  <p className="text-gray-300">{result.solution}</p>
                </div>

                <div className="p-4 bg-neutral-800 rounded-xl">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">💰 Monetization</h3>
                  <p className="text-gray-300">{result.monetization}</p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setResult(null)
                    setIdea('')
                    setError(null)
                  }}
                  className="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  Try Another Idea
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


