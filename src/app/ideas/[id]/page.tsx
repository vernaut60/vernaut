'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

// Import all components
import IdeaInput from './_components/IdeaInput'
import HeroSection from './_components/HeroSection'
import RiskAnalysis from './_components/RiskAnalysis'
import TopRisks from './_components/TopRisks'
import Competitors from './_components/Competitors'
import Recommendation from './_components/Recommendation'
import LockedStages from './_components/LockedStages'

// Import mock data
import { mockStage1Data } from '@/lib/mockData'
import { mockNoDemoData } from '@/lib/mockNoDemoData'

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id
  const [hasDemoData, setHasDemoData] = useState(true)

  // For now, just use mock data
  const data = hasDemoData ? mockStage1Data : mockNoDemoData
  
  // Later, you'll replace this with:
  // const data = await fetchStage1Data(params.id);

  // Transform data for components
  const heroData = {
    ideaTitle: data.idea.title,
    score: data.stage1.score,
    riskScore: data.stage1.risk_score,
    status: "Analysis Complete",
    lastUpdated: "Dec 15, 2024",
    // Show comparison if demo exists
    comparison: data.stage1.comparison,
    scoreFactors: data.stage1.score_factors
  }

  // Enhanced: Show category changes from demo to stage1
  const riskCategories = [
    {
      name: "Market Timing",
      score: data.risk_categories.market_timing.score,
      maxScore: 10,
      description: "Market readiness and timing factors",
      color: "text-yellow-400",
      change: data.risk_categories.market_timing.change || undefined,
      reason: data.risk_categories.market_timing.explanation
    },
    {
      name: "Competition",
      score: data.risk_categories.competition_level.score,
      maxScore: 10,
      description: "Competitive landscape and barriers",
      color: "text-orange-400",
      change: data.risk_categories.competition_level.change || undefined,
      reason: data.risk_categories.competition_level.explanation
    },
    {
      name: "Business Viability",
      score: data.risk_categories.business_viability.score,
      maxScore: 10,
      description: "Revenue model and sustainability",
      color: "text-green-400",
      change: data.risk_categories.business_viability.change || undefined,
      reason: data.risk_categories.business_viability.explanation
    },
    {
      name: "Execution Risk",
      score: data.risk_categories.execution_difficulty.score,
      maxScore: 10,
      description: "Technical and operational feasibility",
      color: "text-blue-400",
      change: data.risk_categories.execution_difficulty.change || undefined,
      reason: data.risk_categories.execution_difficulty.explanation
    }
  ]

  const topRisks = data.top_risks.map((risk, index) => ({
    ...risk,
    id: (risk as { id?: string }).id || `risk-${index}`
  }))

  const competitors = data.competitors.map((comp, index) => ({
    id: (comp as { id?: string }).id || `competitor-${index}`,
    name: comp.name,
    website: comp.website,
    pricing: comp.pricing,
    features: comp.key_features,
    yourAdvantage: comp.your_advantage,
    marketPosition: comp.market_position as "leader" | "challenger" | "niche"
  }))

  const recommendation = {
    decision: data.recommendation.verdict.toUpperCase() as "PROCEED" | "PIVOT",
    confidence: data.recommendation.confidence,
    reasoning: data.recommendation.summary,
    conditions: data.recommendation.conditions,
    nextSteps: data.recommendation.next_steps,
    callToAction: "Ready to build your agtech startup?"
  }

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
      {/* Demo Toggle - Development Only */}
      <div className="fixed top-4 right-4 z-50 bg-neutral-800/90 backdrop-blur-sm border border-neutral-600 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-300">Demo Data:</span>
          <button
            onClick={() => setHasDemoData(!hasDemoData)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              hasDemoData ? 'bg-green-600' : 'bg-neutral-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                hasDemoData ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs text-neutral-400">
            {hasDemoData ? 'With Demo' : 'No Demo'}
          </span>
        </div>
      </div>

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
              onClick={() => router.back()}
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
            problem={data.idea.problem}
            audience={data.idea.audience}
            solution={data.idea.solution}
            monetization={data.idea.monetization}
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
