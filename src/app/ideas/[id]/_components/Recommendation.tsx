'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface RecommendationProps {
  decision: 'PROCEED' | 'NEEDS_WORK'  // 'PIVOT' removed - replaced with 'NEEDS_WORK'
  confidence: number
  reasoning: string
  conditions: string[]  // Note: prop name kept as 'conditions' for backward compatibility, but data comes from 'requirements'
  nextSteps: string[]
  verdictLabel?: string  // Optional verdict label for display
  callToAction: string
  riskScore?: number  // Risk score to determine dynamic label
}

export default function Recommendation({ 
  decision, 
  confidence, 
  reasoning, 
  conditions, 
  nextSteps,
  verdictLabel,
  riskScore,
}: RecommendationProps) {
  const getDecisionColor = (decision: string) => {
    return decision === 'PROCEED' 
      ? 'from-green-600/20 to-green-500/20 border-green-500/30' 
      : 'from-orange-600/20 to-orange-500/20 border-orange-500/30'
  }

  const getDecisionIcon = (decision: string) => {
    return decision === 'PROCEED' ? '✅' : '⚠️'
  }
  
  // Display verdict label if available, otherwise use decision
  const displayLabel = verdictLabel || decision

  // Get dynamic label and description based on risk score
  // Risk Level -> Label mapping:
  // 0-4.9: "✅ Recommended Steps" / "Suggestions to strengthen your approach"
  // 5.0-6.9: "✅ Success Requirements" / "Important steps to maximize your chances"
  // 7.0-8.4: "📋 Requirements for Success" / "Key milestones to achieve before scaling"
  // 8.5-10.0: "⚠️ Prerequisites Before Proceeding" / "Essential steps required before building"
  const getConditionsLabel = (): string => {
    if (riskScore !== undefined) {
      if (riskScore >= 0 && riskScore < 5.0) {
        return '✅ Recommended Steps'
      } else if (riskScore >= 5.0 && riskScore < 7.0) {
        return '✅ Success Requirements'
      } else if (riskScore >= 7.0 && riskScore < 8.5) {
        return '📋 Requirements for Success'
      } else if (riskScore >= 8.5) {
        return '⚠️ Prerequisites Before Proceeding'
      }
    }
    
    // Fallback based on decision
    if (decision === 'PROCEED') {
      return '✅ Recommended Steps'
    }
    
    return '📋 Requirements for Success'
  }

  const getConditionsDescription = (): string => {
    if (riskScore !== undefined) {
      if (riskScore >= 0 && riskScore < 5.0) {
        return 'Suggestions to strengthen your approach'
      } else if (riskScore >= 5.0 && riskScore < 7.0) {
        return 'Important steps to maximize your chances'
      } else if (riskScore >= 7.0 && riskScore < 8.5) {
        return 'Key milestones to achieve before scaling'
      } else if (riskScore >= 8.5) {
        return 'Essential steps required before building'
      }
    }
    
    // Fallback
    if (decision === 'PROCEED') {
      return 'Suggestions to strengthen your approach'
    }
    
    return 'Key milestones to achieve before scaling'
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mt-8 mb-8 bg-gray-50/10 border border-gray-200/20 rounded-xl p-6"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          Final Recommendation
        </h2>
        <p className="text-neutral-400 text-sm sm:text-base">
          AI-powered decision based on comprehensive analysis
        </p>
      </motion.div>

      {/* Main Decision Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`bg-gradient-to-r ${getDecisionColor(decision)} border rounded-2xl p-6 sm:p-8 mb-6 shadow-lg`}
      >
        {/* Decision Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-white/10 to-white/5 rounded-full mb-4"
          >
            <span className="text-3xl">{getDecisionIcon(decision)}</span>
          </motion.div>
          
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-2"
          >
            {displayLabel}
          </motion.h3>
          
          {/* Decision Confidence Display */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white/5 rounded-lg p-4 mb-4"
          >
            <div className="text-center">
              <h4 className="text-base font-semibold text-white mb-1">Decision Confidence: {confidence}%</h4>
              <p className="text-xs text-neutral-400 mb-3">How certain we are about this recommendation</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-neutral-700/50 rounded-full h-2 mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
                  className={`h-2 rounded-full ${
                    confidence >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                    confidence >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                    'bg-gradient-to-r from-orange-500 to-orange-400'
                  }`}
                ></motion.div>
              </div>
              
              <p className="text-sm text-neutral-300">
                {confidence >= 85 ? "We're very confident this is the right decision. All signals clearly support proceeding." :
                 confidence >= 65 ? "We're reasonably confident in this recommendation, though some factors create uncertainty." :
                 "This is a close call with mixed signals. We lean toward proceeding, but extra validation is recommended."}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Reasoning */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-gray-50/10 rounded-xl p-6 mb-6 border border-gray-200/20"
        >
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-blue-400">💭</span>
            Why We Recommend {displayLabel}
          </h4>
          <p className="text-neutral-300 leading-relaxed">
            {reasoning}
          </p>
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mb-6"
        >
          <div className="mb-3">
            <h4 className="text-lg font-semibold text-white mb-1">
              {getConditionsLabel()}
            </h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {getConditionsDescription()}
            </p>
          </div>
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-blue-400">{index + 1}</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {condition}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg p-4"
        >
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="text-purple-400">🚀</span>
            Next Steps
          </h4>
          <div className="space-y-2">
            {nextSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 1.1 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-neutral-300">{step}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>


    </motion.div>
  )
}
