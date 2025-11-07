'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Competitor {
  id: string
  name: string
  website: string
  pricing: string
  features: string[]
  yourAdvantage: string
  marketPosition: 'leader' | 'challenger' | 'niche'
  relevance?: 'direct' | 'indirect' | 'none'
  positioning?: {
    target_market: string
    price_tier: 'budget' | 'mid-range' | 'premium' | 'enterprise'
    price_details: string
    key_strengths: string
    company_stage: 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown'
    geographic_focus: string
  }
  threat_level?: number
}

interface CompetitorsProps {
  competitors: Competitor[]
}

interface CompetitorTiers {
  topThreats: Competitor[]
  majorThreats: Competitor[]
  minorThreats: Competitor[]
}

function tierCompetitors(competitors: Competitor[]): CompetitorTiers {
  // Sort by threat_level descending, then by relevance (direct first)
  const sorted = [...competitors].sort((a, b) => {
    const threatDiff = (b.threat_level ?? 0) - (a.threat_level ?? 0)
    if (threatDiff !== 0) return threatDiff
    
    // If threat levels are equal, prioritize direct competitors
    if (a.relevance === 'direct' && b.relevance !== 'direct') return -1
    if (a.relevance !== 'direct' && b.relevance === 'direct') return 1
    return 0
  })

  return {
    topThreats: sorted.filter(c => (c.threat_level ?? 0) >= 8).slice(0, 5),
    majorThreats: sorted.filter(c => {
      const threat = c.threat_level ?? 0
      return threat >= 5 && threat < 8
    }),
    minorThreats: sorted.filter(c => (c.threat_level ?? 0) < 5)
  }
}

export default function Competitors({ competitors }: CompetitorsProps) {
  const [expandedMajor, setExpandedMajor] = useState(false)
  const [expandedMinor, setExpandedMinor] = useState(false)

  // Validate and normalize input
  const validCompetitors = useMemo(() => {
    if (!Array.isArray(competitors)) return []
    return competitors.filter(c => c && typeof c === 'object')
  }, [competitors])

  const tiers = useMemo(() => tierCompetitors(validCompetitors), [validCompetitors])
  
  // Calculate all metrics in a single pass for performance
  const metrics = useMemo(() => {
    const total = validCompetitors.length
    
    if (total === 0) {
      return {
        total: 0,
        directCount: 0,
        directPercent: 0,
        saturation: 0,
        criticalCount: 0,
        highCount: 0,
        minorCount: 0
      }
    }

    let directCount = 0
    let threatSum = 0
    let criticalCount = 0
    let highCount = 0
    let minorCount = 0
    let validThreatCount = 0

    // Single pass through competitors
    for (const competitor of validCompetitors) {
      // Count direct competitors
      if (competitor.relevance === 'direct') {
        directCount++
      }

      // Calculate threat metrics
      const threat = competitor.threat_level ?? null
      if (threat !== null && typeof threat === 'number' && !isNaN(threat)) {
        threatSum += Math.max(0, Math.min(10, threat)) // Clamp to 0-10
        validThreatCount++

        // Categorize threats
        if (threat >= 8) {
          criticalCount++
        } else if (threat >= 5) {
          highCount++
        } else {
          minorCount++
        }
      }
    }

    // Calculate percentages
    const directPercent = Math.round((directCount / total) * 100)
    
    // Calculate saturation based on valid threat levels
    const avgThreat = validThreatCount > 0 ? threatSum / validThreatCount : 0
    const saturation = Math.max(0, Math.min(100, Math.round((avgThreat / 10) * 100)))

    return {
      total,
      directCount,
      directPercent,
      saturation,
      criticalCount,
      highCount,
      minorCount
    }
  }, [validCompetitors])

  const { total, directPercent, saturation, criticalCount, highCount, minorCount } = metrics

  // Helper functions - kept for potential future use
  // const getPositionLabel = (position: string) => {
  //   switch (position) {
  //     case 'leader': return 'Market Leader'
  //     case 'challenger': return 'Strong Challenger'
  //     case 'niche': return 'Niche Player'
  //     default: return 'Competitor'
  //   }
  // }

  // const getPositionIcon = (position: string) => {
  //   switch (position) {
  //     case 'leader': return '👑'
  //     case 'challenger': return '⚔️'
  //     case 'niche': return '🎯'
  //     default: return '🏢'
  //   }
  // }

  // const getPriceTierIcon = (tier: string) => {
  //   switch (tier) {
  //     case 'budget': return '$'
  //     case 'mid-range': return '$$'
  //     case 'premium': return '$$$'
  //     case 'enterprise': return '$$$$'
  //     default: return '$$'
  //   }
  // }

  // const getPriceTierColor = (tier: string) => {
  //   switch (tier) {
  //     case 'budget': return 'text-green-400'
  //     case 'mid-range': return 'text-blue-400'
  //     case 'premium': return 'text-purple-400'
  //     case 'enterprise': return 'text-orange-400'
  //     default: return 'text-neutral-400'
  //   }
  // }

  // const getCompanyStageLabel = (stage: string) => {
  //   switch (stage) {
  //     case 'well-funded': return 'Well-funded startup'
  //     case 'bootstrapped': return 'Bootstrapped'
  //     case 'enterprise': return 'Enterprise company'
  //     case 'startup': return 'Early-stage startup'
  //     case 'unknown': return 'Unknown'
  //     default: return stage
  //   }
  // }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-8 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Competitive Landscape
          </h2>
        </div>
        <p className="text-neutral-400 text-sm sm:text-base ml-4">
          Key competitors and your unique positioning opportunities
        </p>
      </motion.div>

      {/* Always-visible Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="text-white font-medium">{total} competitors</span>
            </div>
            <div className="text-neutral-400">
              {directPercent}% direct
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Saturation:</span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded ${
                      i < Math.floor(saturation / 20)
                        ? 'bg-orange-400'
                        : 'bg-neutral-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-400">
            <span>🔴 {criticalCount} Critical</span>
            <span>🟠 {highCount} High</span>
            <span>🟡 {minorCount} Minor</span>
          </div>
        </div>
      </motion.div>

      {/* Top Threats - Always Expanded */}
      {tiers.topThreats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🔴</span>
            <h3 className="text-xl font-bold text-white">
              Top Threats ({tiers.topThreats.length})
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tiers.topThreats.map((competitor, index) => (
              <CompetitorCard key={competitor.id} competitor={competitor} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Major Threats - Collapsible */}
      {tiers.majorThreats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <button
            onClick={() => setExpandedMajor(!expandedMajor)}
            className="flex items-center justify-between w-full mb-4 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🟠</span>
              <h3 className="text-xl font-bold text-white">
                Major Competitors ({tiers.majorThreats.length})
              </h3>
            </div>
            <motion.div
              animate={{ rotate: expandedMajor ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-neutral-400 text-lg">▼</span>
            </motion.div>
          </button>
          <AnimatePresence>
            {expandedMajor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tiers.majorThreats.map((competitor, index) => (
                    <CompetitorCard key={competitor.id} competitor={competitor} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Minor Threats - Collapsible */}
      {tiers.minorThreats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-6"
        >
          <button
            onClick={() => setExpandedMinor(!expandedMinor)}
            className="flex items-center justify-between w-full mb-4 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🟡</span>
              <h3 className="text-xl font-bold text-white">
                Minor Players ({tiers.minorThreats.length})
              </h3>
            </div>
            <motion.div
              animate={{ rotate: expandedMinor ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-neutral-400 text-lg">▼</span>
            </motion.div>
          </button>
          <AnimatePresence>
            {expandedMinor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tiers.minorThreats.map((competitor, index) => (
                    <CompetitorCard key={competitor.id} competitor={competitor} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  )
}

// Extracted Competitor Card Component
function CompetitorCard({ competitor, index }: { competitor: Competitor; index: number }) {
  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'leader': return 'Market Leader'
      case 'challenger': return 'Strong Challenger'
      case 'niche': return 'Niche Player'
      default: return 'Competitor'
    }
  }

  const getPositionIcon = (position: string) => {
    switch (position) {
      case 'leader': return '👑'
      case 'challenger': return '⚔️'
      case 'niche': return '🎯'
      default: return '🏢'
    }
  }

  const getPriceTierIcon = (tier: string) => {
    switch (tier) {
      case 'budget': return '$'
      case 'mid-range': return '$$'
      case 'premium': return '$$$'
      case 'enterprise': return '$$$$'
      default: return '$$'
    }
  }

  const getPriceTierColor = (tier: string) => {
    switch (tier) {
      case 'budget': return 'text-green-400'
      case 'mid-range': return 'text-blue-400'
      case 'premium': return 'text-purple-400'
      case 'enterprise': return 'text-orange-400'
      default: return 'text-neutral-400'
    }
  }

  const getCompanyStageLabel = (stage: string) => {
    switch (stage) {
      case 'well-funded': return 'Well-funded startup'
      case 'bootstrapped': return 'Bootstrapped'
      case 'enterprise': return 'Enterprise company'
      case 'startup': return 'Early-stage startup'
      case 'unknown': return 'Unknown'
      default: return stage
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 * index }}
      className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            {/* Competitor Header */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {competitor.name}
                  </h3>
                  <a 
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {competitor.website.replace('https://', '').replace('http://', '')}
                  </a>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-lg">{getPositionIcon(competitor.marketPosition)}</span>
                    <span className="text-xs font-medium text-neutral-300">
                      {getPositionLabel(competitor.marketPosition)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Target Market */}
              {competitor.positioning?.target_market && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-neutral-400">🎯</span>
                    <span className="text-sm font-medium text-white">Target Market</span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {competitor.positioning.target_market}
                  </p>
                </div>
              )}

              {/* Geographic Focus */}
              {competitor.positioning?.geographic_focus && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-neutral-400">🌍</span>
                    <span className="text-sm font-medium text-white">Geographic Focus</span>
                  </div>
                  <p className="text-sm text-neutral-300">
                    {competitor.positioning.geographic_focus}
                  </p>
                </div>
              )}

              {/* Company Stage */}
              {competitor.positioning?.company_stage && competitor.positioning.company_stage !== 'unknown' && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-neutral-400">📊</span>
                    <span className="text-sm font-medium text-white">Company Stage</span>
                  </div>
                  <p className="text-sm text-neutral-300">
                    {getCompanyStageLabel(competitor.positioning.company_stage)}
                  </p>
                </div>
              )}
              
              {/* Pricing */}
              <div className="bg-neutral-800/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-neutral-400">💰</span>
                  <span className="text-sm font-medium text-white">Price Tier</span>
                  {competitor.positioning?.price_tier && (
                    <span className={`text-sm font-semibold ${getPriceTierColor(competitor.positioning.price_tier)} ml-1`}>
                      {getPriceTierIcon(competitor.positioning.price_tier)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-300">
                  {competitor.positioning?.price_details || competitor.pricing}
                </p>
              </div>

              {/* Key Strengths */}
              {competitor.positioning?.key_strengths && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="text-yellow-400">⭐</span>
                    Key Strengths
                  </h4>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {competitor.positioning.key_strengths}
                  </p>
                </div>
              )}
            </div>

            {/* Key Features */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-blue-400">🔑</span>
                Key Features
              </h4>
              <div className="space-y-2">
                {competitor.features.map((feature, featureIndex) => (
                  <motion.div
                    key={featureIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + featureIndex * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-neutral-300">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Your Advantage */}
            <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-500/30 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span className="text-green-400">🎯</span>
                Your Advantage
              </h4>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {competitor.yourAdvantage}
              </p>
            </div>
    </motion.div>
  )
}
