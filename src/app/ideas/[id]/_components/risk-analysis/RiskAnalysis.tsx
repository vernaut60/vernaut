'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionHeader } from '../common'

interface RiskCategory {
  name: string
  score: number
  maxScore: number
  description: string
  color: string
  change?: number
  reason?: string
}

interface RiskAnalysisProps {
  categories: RiskCategory[]
}

export default function RiskAnalysis({ categories }: RiskAnalysisProps) {
  // Simple toggle: clicking any info icon opens/closes all sections at once
  const [allExpanded, setAllExpanded] = useState(false)

  // Category explanations
  const categoryExplanations: Record<string, { title: string; description: string; examples: string[] }> = {
    'Market Timing': {
      title: 'Market Timing Risk',
      description: 'Measures how ready the market is for your idea. Considers current demand, market maturity, and timing factors.',
      examples: [
        'Perfect timing: Market is ready, validated demand exists',
        'Good timing: Market is emerging, early adopters are ready',
        'Poor timing: Market not ready, too early or demand unclear'
      ]
    },
    'Competition': {
      title: 'Competition Risk',
      description: 'Assesses how competitive the landscape is. Looks at number of competitors, market saturation, and differentiation difficulty.',
      examples: [
        'Low competition: Few players, blue ocean opportunity',
        'Moderate competition: Some players, differentiation possible',
        'High competition: Saturated market, many established players'
      ]
    },
    'Business Viability': {
      title: 'Business Viability Risk',
      description: 'Evaluates the revenue model and financial sustainability. Considers monetization clarity, validation, and funding adequacy.',
      examples: [
        'Low risk: Clear revenue model, validated demand, adequate funding',
        'Medium risk: Some monetization ideas, needs validation',
        'High risk: No monetization, no validation, insufficient budget'
      ]
    },
    'Execution Risk': {
      title: 'Execution Risk',
      description: 'Measures how difficult it will be to build and scale your idea. Considers technical complexity, required skills, and resource availability.',
      examples: [
        'Low risk: Simple tech, adequate skills/budget, easy to build',
        'Medium risk: Moderate complexity, manageable with resources',
        'High risk: Complex tech, insufficient skills/budget, very difficult'
      ]
    }
  }

  const getBarColor = (score: number, maxScore: number) => {
    // Higher score = higher risk (red), lower score = lower risk (green)
    const percentage = (score / maxScore) * 100
    if (percentage >= 70) return 'from-red-500 to-red-400' // High risk = red
    if (percentage >= 40) return 'from-yellow-500 to-yellow-400' // Medium risk = yellow
    return 'from-green-500 to-green-400' // Low risk = green
  }

  const getRiskLevel = (score: number, maxScore: number) => {
    // Higher score = higher risk, lower score = lower risk
    const percentage = (score / maxScore) * 100
    if (percentage >= 70) return 'High Risk' // 7.0-10.0 = High risk
    if (percentage >= 40) return 'Medium Risk' // 4.0-6.9 = Medium risk
    return 'Low Risk' // 0.0-3.9 = Low risk
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      {/* Section Header */}
      <SectionHeader
        icon="📊"
        title="Risk Analysis"
        description="Comprehensive breakdown of potential challenges and market risks"
        gradientFrom="from-blue-400"
        gradientTo="to-indigo-400"
        titleClassName="text-2xl sm:text-3xl"
        descriptionClassName="ml-4"
        className="mb-8"
      />

      {/* Risk Categories Grid */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
        {categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all"
          >
            {/* Category Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {category.name}
                  </h3>
                  {/* Info Icon - Clickable */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Simple toggle: clicking any icon opens/closes all sections
                      setAllExpanded(prev => !prev)
                    }}
                    className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center transition-all duration-200 group ${
                      allExpanded
                        ? 'bg-white/20 border-white/40' // Active state
                        : 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30' // Default state
                    }`}
                    aria-label={`Learn more about ${category.name}`}
                    aria-expanded={allExpanded}
                  >
                    <svg 
                      className={`w-3 h-3 sm:w-4 sm:h-4 transition-all ${
                        allExpanded
                          ? 'text-white' // Active: white
                          : 'text-neutral-400 group-hover:text-white' // Default: gray, white on hover
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-neutral-400">
                  {category.description}
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${
                    getRiskLevel(category.score, category.maxScore) === 'Low Risk' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    getRiskLevel(category.score, category.maxScore) === 'Medium Risk' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {getRiskLevel(category.score, category.maxScore)}
                  </span>
                  <span className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
                    {category.score.toFixed(1)}/{category.maxScore}
                  </span>
                  {/* Show change if available */}
                  {category.change !== undefined && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.change > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      category.change < 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {category.change > 0 ? '+' : ''}{category.change}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-neutral-400">Risk Level</span>
                <span className="text-xs sm:text-sm text-neutral-300 font-medium">
                  {Math.round((category.score / category.maxScore) * 100)}%
                </span>
              </div>
              <div className="w-full bg-neutral-700/50 rounded-full h-2 sm:h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(category.score / category.maxScore) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.2, ease: "easeOut" }}
                  className={`h-2 sm:h-2.5 rounded-full bg-gradient-to-r ${getBarColor(category.score, category.maxScore)}`}
                />
              </div>
            </div>

            {/* Risk Explanation */}
            {category.reason && (
              <div className="mb-3">
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed line-clamp-4">
                  {category.reason}
                </p>
              </div>
            )}

            {/* Risk Indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <div className={`w-2 h-2 rounded-full ${
                getRiskLevel(category.score, category.maxScore) === 'Low Risk' ? 'bg-green-400' :
                getRiskLevel(category.score, category.maxScore) === 'Medium Risk' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-xs sm:text-sm text-neutral-400">
                {getRiskLevel(category.score, category.maxScore)}
              </span>
            </div>

            {/* Expandable Info Section */}
            <AnimatePresence>
              {allExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-white/10 mt-3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="pt-4 pb-2"
                  >
                    <div className="bg-white/5 rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">
                          {categoryExplanations[category.name]?.title || category.name}
                        </h4>
                        <p className="text-sm text-neutral-300 leading-relaxed">
                          {categoryExplanations[category.name]?.description || 'Risk assessment for this category.'}
                        </p>
                      </div>
                      
                      {categoryExplanations[category.name]?.examples && (
                        <div>
                          <p className="text-xs font-medium text-neutral-400 mb-2">Examples:</p>
                          <ul className="space-y-1.5">
                            {categoryExplanations[category.name].examples.map((example, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 leading-relaxed">
                                <span className="text-neutral-500 mt-0.5">•</span>
                                <span>{example}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

    </motion.div>
  )
}
