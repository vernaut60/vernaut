'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { STAGE_CONFIG } from '@/lib/stages'

// Import all components
import IdeaInput from '../../_components/risk-analysis/IdeaInput'
import RiskAnalysis from '../../_components/risk-analysis/RiskAnalysis'
import TopRisks from '../../_components/risk-analysis/TopRisks'
import Competitors from '../../_components/risk-analysis/Competitors'
import Recommendation from '../../_components/risk-analysis/Recommendation'
import LockedStages from '../../_components/risk-analysis/LockedStages'
import LoadingState from '../../wizard/_components/LoadingState'
import { StickySidebar } from '../../_components/common'

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
        verdict: 'proceed' | 'needs_work'
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
    }>
    updated_at?: string
    created_at?: string
  }
  message?: string
}

export default function Stage1Page() {
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
  const maxPollTime = 600000
  const warningTime = 180000
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
    setPollWarning(null)
  }, [])

  // Poll for status updates with exponential backoff
  const pollForCompletion = useCallback(async () => {
    if (!session?.access_token) {
      stopPolling()
      return
    }

    if (pollStartTimeRef.current) {
      const elapsed = Date.now() - pollStartTimeRef.current
      
      if (elapsed >= warningTime && elapsed < maxPollTime) {
        setPollWarning('Analysis is taking longer than usual. This can happen with complex ideas. Please keep this page open - it will complete automatically.')
      }
      
      if (elapsed >= maxPollTime) {
        stopPolling()
        setIsGenerating(false)
        setError('Analysis is taking much longer than expected. The analysis may still be running in the background. Please refresh the page in a few minutes to check the status.')
        return
      }
    }

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: ApiIdeaResponse = await response.json()

      if (!response.ok || !data.success || !data.idea) {
        console.warn('[Stage1Page] Poll request failed, will retry:', data.message)
      } else {
        if (data.idea.status === 'complete' && data.idea.score) {
          stopPolling()
          setIsGenerating(false)
          setPollWarning(null)
          setApiData(data.idea)
          return
        }

        if (data.idea.status === 'stage1_failed') {
          stopPolling()
          setIsGenerating(false)
          setPollWarning(null)
          setError('Analysis generation failed. Please try again or contact support.')
          return
        }
      }
    } catch (err) {
      console.warn('[Stage1Page] Poll error, will retry:', err)
    }

    pollAttemptRef.current += 1
    const delays = [3000, 5000, 8000, 10000]
    const baseDelay = delays[Math.min(pollAttemptRef.current - 1, delays.length - 1)]
    const jitter = 0.8 + Math.random() * 0.4
    const delay = Math.round(baseDelay * jitter)

    pollIntervalRef.current = setTimeout(pollForCompletion, delay)
  }, [ideaId, session?.access_token, stopPolling, maxPollTime, warningTime])

  const startPolling = useCallback(() => {
    stopPolling()
    setPollWarning(null)
    pollStartTimeRef.current = Date.now()
    pollAttemptRef.current = 0
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

      const response = await fetch(`/api/ideas/${ideaId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: ApiIdeaResponse = await response.json()

      if (!response.ok || !data.success || !data.idea) {
        throw new Error(data.message || 'Failed to fetch idea data')
      }

      if (data.idea.status === 'questions_ready' || data.idea.status === 'generating_questions') {
        router.push(`/ideas/${ideaId}/wizard`)
        return
      }

      if (data.idea.status === 'generating_stage1') {
        setIsGenerating(true)
        setLoading(false)
        startPolling()
        return
      }

      if (data.idea.status === 'stage1_failed') {
        throw new Error('Analysis generation failed. Please try again or contact support.')
      }

      if (data.idea.status !== 'complete' || !data.idea.score) {
        throw new Error('Analysis not yet complete. Please wait for the analysis to finish.')
      }

      setIsGenerating(false)
      stopPolling()
      setApiData(data.idea)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('[Stage1Page] Failed to fetch idea:', err)
    } finally {
      setLoading(false)
    }
  }, [ideaId, session?.access_token, router, startPolling, stopPolling])

  useEffect(() => {
    fetchIdeaData()
  }, [fetchIdeaData])

  useEffect(() => {
    if (!isGenerating) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollIntervalRef.current) {
          clearTimeout(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      } else {
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

    const riskCategories = [
      {
        name: "Market Timing",
        score: categoryScores.market_timing ?? 5.0,
        maxScore: 10,
        description: "Market readiness and timing factors",
        color: "text-yellow-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.market_timing ?? 'Analysis pending'
      },
      {
        name: "Competition",
        score: categoryScores.competition_level ?? 5.0,
        maxScore: 10,
        description: "Competitive landscape and barriers",
        color: "text-orange-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.competition_level ?? 'Analysis pending'
      },
      {
        name: "Business Viability",
        score: categoryScores.business_viability ?? 5.0,
        maxScore: 10,
        description: "Revenue model and sustainability",
        color: "text-green-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.business_viability ?? 'Analysis pending'
      },
      {
        name: "Execution Risk",
        score: categoryScores.execution_difficulty ?? 5.0,
        maxScore: 10,
        description: "Technical and operational feasibility",
        color: "text-blue-400",
        change: undefined,
        reason: riskAnalysis?.explanations?.execution_difficulty ?? 'Analysis pending'
      }
    ]

    const topRisks = (riskAnalysis?.top_risks || []).map((risk, index) => ({
      ...risk,
      id: `risk-${index}`
    }))

    const competitors = (idea.competitors || []).map((comp, index) => {
      const threatLevel = comp.threat_level
      const relevance: 'direct' | 'indirect' | 'none' = comp.is_direct_competitor === true 
        ? 'direct' 
        : comp.is_direct_competitor === false 
          ? 'indirect' 
          : 'none'
      
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
        const priceMatch = comp.description.match(/\$[\d,]+(?:\/month|\/year)?/i)
        if (priceMatch) {
          pricing = priceMatch[0]
        }
      }

      let positioning: {
        target_market: string
        price_tier: 'budget' | 'mid-range' | 'premium' | 'enterprise'
        price_details: string
        key_strengths: string
        company_stage: 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown'
        geographic_focus: string
      } | undefined = undefined

      if (comp.positioning) {
        positioning = {
          target_market: comp.positioning.target_market || 'Not specified',
          price_tier: comp.positioning.price_tier || 'mid-range',
          price_details: comp.positioning.price_details || pricing,
          key_strengths: comp.positioning.key_strengths || comp.description || '',
          company_stage: comp.positioning.company_stage || 'unknown',
          geographic_focus: comp.positioning.geographic_focus || 'Global'
        }
      } else if (comp.description) {
        const desc = comp.description
        const geoMatch = desc.match(/Geographic focus: ([^.]+)/i)
        const stageMatch = desc.match(/Company stage: ([^.]+)/i)
        const priceTierMatch = desc.match(/(budget|mid-range|premium|enterprise)\s+pricing/i)
        
        let extractedPriceDetails = pricing
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

    const riskScore = idea.risk_score ?? undefined
    const recommendation = aiInsights?.recommendation ? {
      decision: (aiInsights.recommendation.verdict === 'proceed' ? 'PROCEED' : 'NEEDS_WORK') as "PROCEED" | "NEEDS_WORK",
      confidence: aiInsights.recommendation.confidence,
      reasoning: aiInsights.recommendation.summary,
      conditions: aiInsights.recommendation.requirements || [],
      nextSteps: aiInsights.recommendation.next_steps || [],
      verdictLabel: aiInsights.recommendation.verdict_label,
      callToAction: "Ready to build your startup?",
      riskScore: riskScore
    } : {
      decision: 'NEEDS_WORK' as const,
      confidence: 0,
      reasoning: 'Analysis not available',
      conditions: [],
      nextSteps: [],
      callToAction: "Analysis pending",
      riskScore: riskScore
    }

    const hasWizardCompleted = !!idea.wizard_completed_at
    const hasDemoData = !hasWizardCompleted && !!(idea.problem || idea.audience || idea.solution || idea.monetization)

    return {
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

  if (loading) {
    return (
      <LoadingState 
        message="Loading your analysis..."
        subMessage="Fetching idea details and insights"
      />
    )
  }

  if (isGenerating) {
    return (
      <>
        <LoadingState 
          message="Generating your analysis..."
          subMessage={pollWarning || "This usually takes ~60 seconds. We're analyzing your idea, discovering competitors, and calculating risks."}
        />
        {pollWarning && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">{pollWarning}</p>
          </div>
        )}
      </>
    )
  }

  if (error || !apiData) {
    return (
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
    )
  }

  const uiData = transformApiDataToUI(apiData)
  const { riskCategories, topRisks, competitors, recommendation, idea, hasDemoData } = uiData

  // Get locked stages (stages 2-7) for LockedStages component
  const lockedStages = STAGE_CONFIG.filter((stage: { id: number }) => stage.id > 1).map((stage: { id: number; title: string; description?: string; teaser?: string; lockedContent?: string; estimatedTime?: string; value?: string }) => ({
    id: stage.id,
    title: stage.title,
    description: stage.description || '',
    teaser: stage.teaser || '',
    lockedContent: stage.lockedContent || '',
    estimatedTime: stage.estimatedTime || '',
    value: stage.value || ''
  }))

  // Define sections for sidebar navigation
  const sidebarSections = [
    { id: 'idea-input', title: 'Your Idea', icon: '💡' },
    { id: 'risk-analysis', title: 'Risk Assessment', icon: '⚠️' },
    { id: 'top-risks', title: 'Top Risks', icon: '🔴' },
    { id: 'competitors', title: 'Competitors', icon: '⚔️' },
    { id: 'recommendation', title: 'Recommendation', icon: '🎯' }
  ]

  return (
    <>
      <StickySidebar sections={sidebarSections} topOffset={80} />
      <div className="space-y-8">
        <div id="idea-input">
          <IdeaInput 
            problem={idea.problem}
            audience={idea.audience}
            solution={idea.solution}
            monetization={idea.monetization}
            hasDemoData={hasDemoData}
          />
        </div>
        <div id="risk-analysis">
          <RiskAnalysis categories={riskCategories} />
        </div>
        <div id="top-risks">
          <TopRisks risks={topRisks} />
        </div>
        <div id="competitors">
          <Competitors competitors={competitors} />
        </div>
        <div id="recommendation">
          <Recommendation {...recommendation} />
        </div>
        <LockedStages stages={lockedStages} unlockPrice="$39" />
      </div>
    </>
  )
}

