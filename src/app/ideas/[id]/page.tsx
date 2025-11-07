'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

// Import all components
import IdeaInput from './_components/IdeaInput'
import HeroSection from './_components/HeroSection'
import RiskAnalysis from './_components/RiskAnalysis'
import TopRisks from './_components/TopRisks'
import Competitors from './_components/Competitors'
import Recommendation from './_components/Recommendation'
import LockedStages from './_components/LockedStages'
import LoadingState from './wizard/_components/LoadingState'

// Types for API response
interface ApiIdeaResponse {
  success: boolean
  idea: {
    id: string
    status: string
    idea_text: string
    title?: string
    score?: number
    risk_score?: number
    risk_analysis?: {
      overall_score: number
      category_scores: {
        business_viability: number
        market_timing: number
        competition_level: number
        execution_difficulty: number
      }
      explanations: {
        business_viability: string
        market_timing: string
        competition_level: string
        execution_difficulty: string
      }
      risk_level: 'Low' | 'Medium' | 'High'
      top_risks?: Array<{
        title: string
        severity: number
        category: string
        why_it_matters: string
        mitigation_steps: string[]
        timeline: string
      }>
    }
    ai_insights?: {
      recommendation: {
        verdict: 'proceed' | 'needs_work'  // 'pivot' removed
        verdict_label: string
        confidence: number
        summary: string
        requirements: string[]
        next_steps: string[]
      }
      score_factors?: Array<{
        factor: string
        impact: string
        category: string
      }>
    }
    problem?: string
    audience?: string
    solution?: string
    monetization?: string
    wizard_completed_at?: string | null
    competitors?: Array<{
      id?: string
      name: string
      website?: string
      description?: string
      positioning?: {
        target_market?: string
        price_tier?: 'budget' | 'mid-range' | 'premium' | 'enterprise'
        price_details?: string
        key_strengths?: string
        company_stage?: 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown'
        geographic_focus?: string
      } | null
      pricing_model?: string
      pricing_amount?: number
      key_features?: string[]
      our_differentiation?: string
      threat_level?: number
      is_direct_competitor?: boolean
      // Note: relevance is inferred from is_direct_competitor
    }>
    updated_at?: string
    created_at?: string
  }
  message?: string
}

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const ideaId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<ApiIdeaResponse['idea'] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pollWarning, setPollWarning] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollAttemptRef = useRef(0)
  const maxPollTime = 600000 // 10 minutes max (600 seconds) - Stage 1 analysis can take 2-5 minutes
  const warningTime = 180000 // Show warning after 3 minutes
  const pollStartTimeRef = useRef<number | null>(null)

  // Helper function to infer market position from threat_level
  const inferMarketPosition = (threatLevel?: number): "leader" | "challenger" | "niche" => {
    if (!threatLevel) return 'niche'
    if (threatLevel >= 8) return 'leader'
    if (threatLevel >= 5) return 'challenger'
    return 'niche'
  }

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    pollAttemptRef.current = 0
    pollStartTimeRef.current = null
    setPollWarning(null) // Clear warning when polling stops
  }, [])

  // Poll for status updates with exponential backoff
  const pollForCompletion = useCallback(async () => {
    if (!session?.access_token) {
      stopPolling()
      return
    }

    // Check elapsed time and show warnings/timeouts
    if (pollStartTimeRef.current) {
      const elapsed = Date.now() - pollStartTimeRef.current
      
      // Show warning after 3 minutes (analysis is taking longer than usual)
      if (elapsed >= warningTime && elapsed < maxPollTime) {
        setPollWarning('Analysis is taking longer than usual. This can happen with complex ideas. Please keep this page open - it will complete automatically.')
      }
      
      // Only timeout after 10 minutes (very long time - likely stuck)
      if (elapsed >= maxPollTime) {
        stopPolling()
        setIsGenerating(false)
        setError('Analysis is taking much longer than expected. The analysis may still be running in the background. Please refresh the page in a few minutes to check the status.')
        return
      }
    }

    try {
      const response = await fetch(`/api/ideas/${ideaId}?include=stage1,competitors`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: ApiIdeaResponse = await response.json()

      if (!response.ok || !data.success || !data.idea) {
        // On error, continue polling (might be temporary)
        console.warn('[IdeaDetailPage] Poll request failed, will retry:', data.message)
      } else {
        // Check status
        if (data.idea.status === 'complete' && data.idea.score) {
          // Analysis complete!
          stopPolling()
          setIsGenerating(false)
          setPollWarning(null) // Clear warning on completion
          setApiData(data.idea)
          return
        }

        if (data.idea.status === 'stage1_failed') {
          stopPolling()
          setIsGenerating(false)
          setPollWarning(null) // Clear warning on failure
          setError('Analysis generation failed. Please try again or contact support.')
          return
        }

        // Still generating, continue polling
      }
    } catch (err) {
      // Network error, continue polling
      console.warn('[IdeaDetailPage] Poll error, will retry:', err)
    }

    // Calculate next poll delay with exponential backoff
    pollAttemptRef.current += 1
    const delays = [3000, 5000, 8000, 10000] // 3s, 5s, 8s, 10s
    const baseDelay = delays[Math.min(pollAttemptRef.current - 1, delays.length - 1)]
    // Add 20% jitter to avoid herd effects
    const jitter = 0.8 + Math.random() * 0.4
    const delay = Math.round(baseDelay * jitter)

    // Schedule next poll
    pollIntervalRef.current = setTimeout(pollForCompletion, delay)
  }, [ideaId, session?.access_token, stopPolling, maxPollTime, warningTime])

  // Start polling
  const startPolling = useCallback(() => {
    stopPolling() // Clear any existing polling (this also clears warning)
    setPollWarning(null) // Ensure warning is cleared when starting fresh
    pollStartTimeRef.current = Date.now()
    pollAttemptRef.current = 0
    // Start first poll after 3 seconds
    pollIntervalRef.current = setTimeout(pollForCompletion, 3000)
  }, [pollForCompletion, stopPolling])

  // Fetch idea data from API
  const fetchIdeaData = useCallback(async () => {
    if (!session?.access_token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ideas/${ideaId}?include=stage1,competitors`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: ApiIdeaResponse = await response.json()

      if (!response.ok || !data.success || !data.idea) {
        throw new Error(data.message || 'Failed to fetch idea data')
      }

      // Handle different statuses
      if (data.idea.status === 'questions_ready' || data.idea.status === 'generating_questions') {
        // Redirect to wizard if questions not ready or still generating
        router.push(`/ideas/${ideaId}/wizard`)
        return
      }

      if (data.idea.status === 'generating_stage1') {
        // Start polling for completion
        setIsGenerating(true)
        setLoading(false) // Initial load complete, now polling
        startPolling()
        return
      }

      if (data.idea.status === 'stage1_failed') {
        throw new Error('Analysis generation failed. Please try again or contact support.')
      }

      if (data.idea.status !== 'complete' || !data.idea.score) {
        throw new Error('Analysis not yet complete. Please wait for the analysis to finish.')
      }

      // Analysis is complete
      setIsGenerating(false)
      stopPolling()
      setApiData(data.idea)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('[IdeaDetailPage] Failed to fetch idea:', err)
    } finally {
      setLoading(false)
    }
  }, [ideaId, session?.access_token, router, startPolling, stopPolling])

  // Fetch data on mount
  useEffect(() => {
    fetchIdeaData()
  }, [fetchIdeaData])

  // Page Visibility API: Pause/resume polling when tab is hidden/visible
  useEffect(() => {
    if (!isGenerating) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause polling
        if (pollIntervalRef.current) {
          clearTimeout(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
        // Tab visible - resume polling immediately
        if (isGenerating && pollIntervalRef.current === null) {
          pollForCompletion()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isGenerating, pollForCompletion])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Transform API data to UI format
  const transformApiDataToUI = (idea: ApiIdeaResponse['idea']) => {
    const riskAnalysis = idea.risk_analysis
    const aiInsights = idea.ai_insights
    const categoryScores = riskAnalysis?.category_scores || {
      business_viability: 5.0,
      market_timing: 5.0,
      competition_level: 5.0,
      execution_difficulty: 5.0
    }

    // Hero data
  const heroData = {
      ideaTitle: idea.title || idea.idea_text.substring(0, 50) || 'Untitled Idea',
      score: idea.score || 0,
      riskScore: idea.risk_score || 0,
      status: idea.status === 'complete' ? 'Analysis Complete' : 'Processing',
      lastUpdated: idea.updated_at 
        ? new Date(idea.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Unknown',
      comparison: undefined, // Demo comparison not implemented yet
      scoreFactors: aiInsights?.score_factors || []
    }

    // Risk categories - use backend data directly
    // Backend now provides ALL scores as RISK scores (higher = higher risk)
    // The component expects: higher score = higher risk (red), lower score = lower risk (green)
    // NO inversion needed - all scores are already risk scores
  const riskCategories = [
    {
      name: "Market Timing",
        score: categoryScores.market_timing ?? 5.0,
      maxScore: 10,
      description: "Market readiness and timing factors",
      color: "text-yellow-400",
        change: undefined, // Demo comparison not implemented
        reason: riskAnalysis?.explanations?.market_timing ?? 'Analysis pending'
    },
    {
      name: "Competition",
        // Backend: competition_level is already a risk score (higher = higher risk)
        score: categoryScores.competition_level ?? 5.0,
      maxScore: 10,
      description: "Competitive landscape and barriers",
      color: "text-orange-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.competition_level ?? 'Analysis pending'
    },
    {
      name: "Business Viability",
        // Backend: business_viability is now a risk score (higher = higher risk)
        score: categoryScores.business_viability ?? 5.0,
      maxScore: 10,
      description: "Revenue model and sustainability",
      color: "text-green-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.business_viability ?? 'Analysis pending'
    },
    {
      name: "Execution Risk",
        // Backend: execution_difficulty is already a risk score (higher = higher risk)
        score: categoryScores.execution_difficulty ?? 5.0,
      maxScore: 10,
      description: "Technical and operational feasibility",
      color: "text-blue-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.execution_difficulty ?? 'Analysis pending'
    }
  ]

    // Top risks
    const topRisks = (riskAnalysis?.top_risks || []).map((risk, index) => ({
    ...risk,
      id: `risk-${index}`
    }))

    // Competitors
    const competitors = (idea.competitors || []).map((comp, index) => {
      const threatLevel = comp.threat_level
      // Infer relevance from is_direct_competitor
      const relevance: 'direct' | 'indirect' | 'none' = comp.is_direct_competitor === true 
        ? 'direct' 
        : comp.is_direct_competitor === false 
          ? 'indirect' 
          : 'none'
      
      // Construct pricing string from pricing_model and pricing_amount
      let pricing = 'Not specified'
      if (comp.pricing_amount) {
        const amount = comp.pricing_amount
        const model = comp.pricing_model || 'subscription'
        if (model === 'subscription') {
          pricing = `$${amount}/month`
        } else if (model === 'one-time') {
          pricing = `$${amount}`
        } else {
          pricing = comp.description?.match(/\$[\d,]+/)?.[0] || `$${amount}`
        }
      } else if (comp.description) {
        // Try to extract pricing from description
        const priceMatch = comp.description.match(/\$[\d,]+(?:\/month|\/year)?/i)
        if (priceMatch) {
          pricing = priceMatch[0]
        }
      }

      // Reconstruct positioning from description and pricing fields
      // Note: positioning is stored as formatted text in description
      // We'll create a minimal positioning object for UI compatibility
      // NEW: Read from positioning JSONB column first (structured data)
      // FALLBACK: Parse from description for backward compatibility with old data
      let positioning: {
        target_market: string
        price_tier: 'budget' | 'mid-range' | 'premium' | 'enterprise'
        price_details: string
        key_strengths: string
        company_stage: 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown'
        geographic_focus: string
      } | undefined = undefined

      if (comp.positioning) {
        // Use structured positioning data from JSONB column (new approach)
        positioning = {
          target_market: comp.positioning.target_market || 'Not specified',
          price_tier: comp.positioning.price_tier || 'mid-range',
          price_details: comp.positioning.price_details || pricing,
          key_strengths: comp.positioning.key_strengths || comp.description || '',
          company_stage: comp.positioning.company_stage || 'unknown',
          geographic_focus: comp.positioning.geographic_focus || 'Global'
        }
      } else if (comp.description) {
        // FALLBACK: Parse from description for backward compatibility (old data)
        // Format: "target_market. Geographic focus: X. Company stage: Y. price_tier pricing: enhancedPriceDetails. key_strengths"
        const desc = comp.description
        const geoMatch = desc.match(/Geographic focus: ([^.]+)/i)
        const stageMatch = desc.match(/Company stage: ([^.]+)/i)
        const priceTierMatch = desc.match(/(budget|mid-range|premium|enterprise)\s+pricing/i)
        
        // Extract enhanced price details from description (after "pricing: ")
        let extractedPriceDetails = pricing // fallback to basic pricing
        const priceDetailsMatch = desc.match(/pricing:\s*([^.]+)/i)
        if (priceDetailsMatch) {
          extractedPriceDetails = priceDetailsMatch[1].trim()
        }
        
        positioning = {
          target_market: desc.split('.')[0] || 'Not specified',
          price_tier: (priceTierMatch?.[1] as 'budget' | 'mid-range' | 'premium' | 'enterprise') || 'mid-range',
          price_details: extractedPriceDetails,
          key_strengths: comp.description.split('pricing:')[1]?.split('.')[1]?.trim() || comp.description,
          company_stage: (stageMatch?.[1]?.trim().toLowerCase() as 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown') || 'unknown',
          geographic_focus: geoMatch?.[1]?.trim() || 'Global'
        }
      }
      
      return {
        id: comp.id || `competitor-${index}`,
    name: comp.name,
        website: comp.website || '#',
        pricing: pricing,
        features: comp.key_features || [],
        yourAdvantage: comp.our_differentiation || comp.description || '',
        marketPosition: inferMarketPosition(threatLevel),
        relevance: relevance,
        positioning: positioning,
        threat_level: threatLevel
      }
    })

    // Recommendation
    const riskScore = idea.risk_score ?? undefined
    const recommendation = aiInsights?.recommendation ? {
      decision: (aiInsights.recommendation.verdict === 'proceed' ? 'PROCEED' : 'NEEDS_WORK') as "PROCEED" | "NEEDS_WORK",
      confidence: aiInsights.recommendation.confidence,
      reasoning: aiInsights.recommendation.summary,
      conditions: aiInsights.recommendation.requirements || [],
      nextSteps: aiInsights.recommendation.next_steps || [],
      verdictLabel: aiInsights.recommendation.verdict_label, // Include verdict label for display
      callToAction: "Ready to build your startup?",
      riskScore: riskScore // Include risk score for dynamic label
    } : {
      decision: 'NEEDS_WORK' as const,
      confidence: 0,
      reasoning: 'Analysis not available',
      conditions: [],
      nextSteps: [],
      callToAction: "Analysis pending",
      riskScore: riskScore
    }

    // Determine if data is from demo or wizard (only for IdeaInput section)
    // If wizard is completed, always show wizard context (full analysis is shown anyway)
    // Only check for demo if wizard hasn't been completed
    const hasWizardCompleted = !!idea.wizard_completed_at
    const hasDemoData = !hasWizardCompleted && !!(idea.problem || idea.audience || idea.solution || idea.monetization)

    return {
      heroData,
      riskCategories,
      topRisks,
      competitors,
      recommendation,
      idea: {
        problem: idea.problem || '',
        audience: idea.audience || '',
        solution: idea.solution || '',
        monetization: idea.monetization || '',
        title: idea.title || idea.idea_text.substring(0, 50)
      },
      hasDemoData
    }
  }

  // Show loading state (initial load)
  if (loading) {
    return (
      <main className="w-full bg-black text-white relative min-h-screen">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-6">
          <LoadingState 
            message="Loading your analysis..."
            subMessage="Fetching idea details and insights"
          />
        </div>
      </main>
    )
  }

  // Show generating state (polling for Stage 1 completion)
  if (isGenerating) {
    return (
      <main className="w-full bg-black text-white relative min-h-screen">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-6">
          <LoadingState 
            message="Generating your analysis..."
            subMessage={pollWarning || "This usually takes ~60 seconds. We're analyzing your idea, discovering competitors, and calculating risks."}
          />
          {pollWarning && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">{pollWarning}</p>
            </div>
          )}
        </div>
      </main>
    )
  }

  // Show error state
  if (error || !apiData) {
    return (
      <main className="w-full bg-black text-white relative min-h-screen">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-6">
          <div className="text-center py-12">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Analysis</h2>
            <p className="text-neutral-400 mb-6">{error || 'Unable to fetch idea data'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={fetchIdeaData}
                className="px-4 py-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Transform API data
  const uiData = transformApiDataToUI(apiData)
  const { heroData, riskCategories, topRisks, competitors, recommendation, idea, hasDemoData } = uiData

  const lockedStages = [
    {
      id: 2,
      title: "Financial Projections",
      description: "Revenue models, pricing strategies, and financial forecasting",
      teaser: "Detailed financial projections including revenue models, pricing strategies, and 3-year financial forecasts...",
      lockedContent: "Complete financial modeling with multiple scenarios, break-even analysis, funding requirements, and investor-ready financial statements. Includes SaaS metrics, unit economics, and growth projections.",
      estimatedTime: "2-3 weeks",
      value: "$2,500"
    },
    {
      id: 3,
      title: "Go-to-Market Strategy",
      description: "Customer acquisition, marketing channels, and launch plan",
      teaser: "Comprehensive go-to-market strategy with customer acquisition funnels, marketing channel analysis...",
      lockedContent: "Detailed GTM strategy including customer personas, acquisition funnels, marketing channel analysis, content strategy, PR plan, and launch sequence. Includes competitor analysis and positioning strategy.",
      estimatedTime: "3-4 weeks",
      value: "$3,000"
    },
    {
      id: 4,
      title: "Product Roadmap",
      description: "Feature prioritization, development timeline, and MVP definition",
      teaser: "Product roadmap with feature prioritization, development timeline, and MVP definition...",
      lockedContent: "Complete product roadmap with feature prioritization using RICE scoring, development timeline, MVP definition, user stories, and technical architecture. Includes design system and UX guidelines.",
      estimatedTime: "2-3 weeks",
      value: "$2,000"
    },
    {
      id: 5,
      title: "Team & Hiring Plan",
      description: "Organizational structure, key hires, and equity distribution",
      teaser: "Team structure and hiring plan with key roles, equity distribution, and recruitment strategy...",
      lockedContent: "Organizational structure, key hire requirements, equity distribution plan, recruitment strategy, and compensation benchmarks. Includes founder agreements and vesting schedules.",
      estimatedTime: "1-2 weeks",
      value: "$1,500"
    },
    {
      id: 6,
      title: "Funding Strategy",
      description: "Investor targeting, pitch deck, and funding timeline",
      teaser: "Funding strategy with investor targeting, pitch deck structure, and funding timeline...",
      lockedContent: "Complete funding strategy including investor targeting, pitch deck templates, valuation analysis, term sheet negotiation, and funding timeline. Includes demo day preparation and investor relations.",
      estimatedTime: "3-4 weeks",
      value: "$4,000"
    },
    {
      id: 7,
      title: "Execution Plan",
      description: "90-day action plan, milestones, and success metrics",
      teaser: "90-day execution plan with specific milestones, success metrics, and accountability framework...",
      lockedContent: "Detailed 90-day execution plan with specific milestones, success metrics, accountability framework, and weekly check-ins. Includes risk mitigation strategies and contingency plans.",
      estimatedTime: "1-2 weeks",
      value: "$1,000"
    }
  ]

  return (
    <main className="w-full bg-black text-white relative">

      {/* Background graphics matching dashboard - Fixed positioning for full page coverage */}
      <div className="fixed inset-0 w-full h-full z-0">
        {/* Faint gradient overlay at the top */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 via-transparent to-transparent"></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        ></div>
        
        {/* Floating idea sparks - distributed throughout full page height */}
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
          
          {/* Additional sparks for longer content */}
          <div 
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-orange-400/40 rounded-full animate-[ideaSpark_8s_ease-out_infinite]"
            style={{ 
              left: '10%', 
              top: '60%',
              animationDelay: '4.5s'
            }}
          ></div>
          <div 
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-400/40 rounded-full animate-[ideaSpark_7s_ease-out_infinite]"
            style={{ 
              left: '80%', 
              top: '70%',
              animationDelay: '5s'
            }}
          ></div>
          <div 
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-sky-400/40 rounded-full animate-[ideaSpark_9s_ease-out_infinite]"
            style={{ 
              left: '50%', 
              top: '90%',
              animationDelay: '5.5s'
            }}
          ></div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-6 sm:pt-24 sm:pb-8 lg:pt-28 lg:pb-12 min-h-screen">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-700/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Idea Analysis</h1>
          </div>
          <div className="text-sm text-neutral-400">
            ID: {ideaId}
          </div>
        </motion.div>

        {/* All Analysis Components */}
        <div className="space-y-8">
          <HeroSection {...heroData} />
          
          {/* Show input section for all users */}
          <IdeaInput 
            problem={idea.problem}
            audience={idea.audience}
            solution={idea.solution}
            monetization={idea.monetization}
            hasDemoData={hasDemoData}
          />
          
          <RiskAnalysis categories={riskCategories} />
          <TopRisks risks={topRisks} />
          <Competitors competitors={competitors} />
          <Recommendation {...recommendation} />
          <LockedStages stages={lockedStages} unlockPrice="$79" />
        </div>
      </div>
    </main>
  )
}
