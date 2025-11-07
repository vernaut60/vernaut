'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface HeroSectionProps {
  ideaTitle: string
  score: number
  riskScore: number
  status: string
  lastUpdated: string
  comparison?: {
    has_demo: boolean
    demo_score?: number
    score_difference?: number
    demo_risk?: number
    risk_difference?: number
    message?: string
  }
  scoreFactors?: Array<{
    factor: string
    impact: string
    category: string
  }>
}

export default function HeroSection({ 
  ideaTitle, 
  score, 
  riskScore, 
  status, 
  lastUpdated,
  comparison,
  scoreFactors 
}: HeroSectionProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Work'
  }

  const getRiskColor = (risk: number) => {
    if (risk <= 3) return 'text-green-400'
    if (risk <= 6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRiskLabel = (risk: number) => {
    if (risk <= 3) return 'Low Risk'
    if (risk <= 6) return 'Medium Risk'
    return 'High Risk'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      {/* Main Hero Card */}
      <div className="relative rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-b from-[#0a0a0f] to-[#0d0d14] backdrop-blur-md shadow-inner p-6 sm:p-8">
        {/* Inner radial glow */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-70" 
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12), transparent 60%)' }} 
          aria-hidden="true"></div>
        
        <div className="relative z-10">
          {/* Idea Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight"
          >
            {ideaTitle}
          </motion.h1>

          {/* Score and Risk Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Overall Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Idea Quality Score</span>
                <span className="text-xl">💡</span>
              </div>
              <div className={`text-3xl font-bold ${getScoreColor(score)} mb-1 leading-none`}>
                {score}/100
                {comparison?.has_demo && comparison.score_difference && (
                  <span className={`ml-2 text-sm ${
                    comparison.score_difference > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ({comparison.score_difference > 0 ? '+' : ''}{comparison.score_difference})
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-300">
                {getScoreLabel(score)} Potential
                {comparison?.has_demo && (
                  <div className="text-xs text-neutral-400 mt-1">
                    Personalized vs Demo
                  </div>
                )}
              </div>
            </motion.div>

            {/* Risk Score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Risk Level</span>
                <span className="text-xl">⚠️</span>
              </div>
              <div className={`text-3xl font-bold ${getRiskColor(riskScore)} mb-1 leading-none`}>
                {riskScore}/10
                {comparison?.has_demo && comparison.risk_difference && (
                  <span className={`ml-2 text-sm ${
                    comparison.risk_difference < 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ({comparison.risk_difference > 0 ? '+' : ''}{comparison.risk_difference})
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-300">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  riskScore <= 3 ? 'bg-green-50 text-green-800' :
                  riskScore <= 6 ? 'bg-yellow-50 text-yellow-800' :
                  'bg-red-50 text-red-800'
                }`}>
                  {getRiskLabel(riskScore)}
                </span>
                {comparison?.has_demo && (
                  <div className="text-xs text-neutral-400 mt-1">
                    Personalized vs Demo
                  </div>
                )}
              </div>
            </motion.div>

            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Status</span>
                <span className="text-xl">✅</span>
              </div>
              <div className="text-lg font-semibold text-white mb-1">
                {status}
              </div>
              <div className="text-sm text-neutral-300">
                Free Analysis Complete
              </div>
            </motion.div>

            {/* Last Updated */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-neutral-400">Updated</span>
                <span className="text-xl">📅</span>
              </div>
              <div className="text-lg font-semibold text-white mb-1">
                {lastUpdated}
              </div>
              <div className="text-sm text-neutral-300">
                Analysis Complete
              </div>
            </motion.div>
          </div>



          {/* Score Improvement Section */}
          {comparison?.has_demo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-6 bg-gradient-to-r from-green-600/10 to-blue-600/10 border border-green-500/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📈</span>
                <h3 className="text-lg font-semibold text-white">
                  Personalized Assessment Improvement
                </h3>
              </div>
              <p className="text-sm text-neutral-300 mb-3">
                {comparison.message || `Your personalized analysis improved the score by ${comparison.score_difference} points based on your specific background and approach.`}
              </p>
              <div className="space-y-2">
                {scoreFactors?.map((factor, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-green-400 text-sm mt-0.5">✓</span>
                    <span className="text-sm text-neutral-300">{factor.factor} - {factor.impact}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Score Factors Section (for no-demo users) */}
          {!comparison?.has_demo && scoreFactors && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <h3 className="text-lg font-semibold text-white">
                  Based on Your Background
                </h3>
              </div>
              <p className="text-sm text-neutral-300 mb-3">
                Your personalized analysis considers your specific background and approach.
              </p>
              <div className="space-y-3">
                {scoreFactors.map((factor, index) => {
                  const isPositive = factor.impact?.toLowerCase() === 'positive'
                  const isNegative = factor.impact?.toLowerCase() === 'negative'
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        isPositive 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : isNegative
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-neutral-500/10 border-neutral-500/30'
                      }`}
                    >
                      {/* Icon based on impact */}
                      <span className={`text-lg mt-0.5 flex-shrink-0 ${
                        isPositive 
                          ? 'text-green-400' 
                          : isNegative
                          ? 'text-red-400'
                          : 'text-neutral-400'
                      }`}>
                        {isPositive ? '✓' : isNegative ? '✗' : '•'}
                      </span>
                      
                      {/* Factor text */}
                      <div className="flex-1">
                        <p className="text-sm text-neutral-200 leading-relaxed">
                          {factor.factor}
                        </p>
                        
                        {/* Impact badge */}
                        {factor.impact && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              isPositive
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : isNegative
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
                            }`}>
                              <span className="font-bold">{isPositive ? '+' : isNegative ? '-' : '•'}</span>
                              <span className="capitalize">{factor.impact}</span>
                            </span>
                            
                            {/* Category badge (optional, subtle) */}
                            {factor.category && (
                              <span className="text-xs text-neutral-500">
                                {factor.category}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  )
}
