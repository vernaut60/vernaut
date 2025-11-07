'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Risk {
  id: string
  title: string
  severity: number
  why_it_matters: string
  mitigation_steps: string[]
  timeline: string
  category: string
}

interface TopRisksProps {
  risks: Risk[]
}

export default function TopRisks({ risks }: TopRisksProps) {
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null)


  const getSeverityLabel = (severity: number, maxSeverity: number) => {
    const percentage = (severity / maxSeverity) * 100
    if (percentage >= 80) return 'Critical'
    if (percentage >= 60) return 'High'
    if (percentage >= 40) return 'Medium'
    return 'Low'
  }

  const getSeverityColor = (severity: number, maxSeverity: number) => {
    const percentage = (severity / maxSeverity) * 100
    if (percentage >= 80) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' // Critical = red
    if (percentage >= 60) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' // High = orange
    if (percentage >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' // Medium = yellow
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' // Low = green
  }

  const getSeverityBarColor = (severity: number, maxSeverity: number) => {
    const percentage = (severity / maxSeverity) * 100
    if (percentage >= 80) return 'bg-red-400' // Critical = red
    if (percentage >= 60) return 'bg-orange-400' // High = orange
    if (percentage >= 40) return 'bg-yellow-400' // Medium = yellow
    return 'bg-green-400' // Low = green
  }


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
          <div className="w-1 h-8 bg-gradient-to-b from-orange-400 to-red-400 rounded-full"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Top Risks & Mitigation
          </h2>
        </div>
        <p className="text-neutral-400 text-sm sm:text-base ml-4">
          Based on your risk analysis above, here are your TOP 3 RISKS to address:
        </p>
      </motion.div>

      {/* Risk Cards */}
      <div className="space-y-4">
        {risks.map((risk, index) => (
          <motion.div
            key={risk.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            {/* Risk Header */}
            <div 
              className="p-4 cursor-pointer hover:bg-white/5 transition-colors duration-200"
              onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
            >
              <div className="flex items-start gap-4">
                {/* Severity Color Indicator */}
                <div className={`w-1 h-full rounded-full ${getSeverityBarColor(risk.severity, 10)}`}></div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">
                      {risk.category === 'Competition' ? '🧩' : 
                       risk.category === 'Domain Knowledge' ? '🌱' : 
                       risk.category === 'Legal' ? '📜' : '⚠️'}
                    </span>
                    <h3 className="text-lg font-semibold text-white">
                      {risk.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3 flex-wrap">
                    <span className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-full ${getSeverityColor(risk.severity, 10)}`}>
                      {getSeverityLabel(risk.severity, 10)} {risk.severity}/10
                    </span>
                    {risk.timeline && (
                      <span className="text-xs sm:text-sm text-neutral-400">{risk.timeline}</span>
                    )}
                  </div>
                  
                  {/* Preview text - truncated, only shown when collapsed */}
                  {expandedRisk !== risk.id && (
                    <p className="text-sm text-neutral-400 leading-relaxed line-clamp-2">
                      {risk.why_it_matters}
                    </p>
                  )}
                </div>
                
                {/* Expand/Collapse Button */}
                <motion.div
                  animate={{ rotate: expandedRisk === risk.id ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedRisk === risk.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-white/10"
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="p-4 bg-white/5"
                  >
                    {/* Why This Matters */}
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-yellow-400 to-orange-400 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-white">
                          Why This Matters
                        </h4>
                      </div>
                      <p className="text-sm text-neutral-300 leading-relaxed ml-4">
                        {risk.why_it_matters}
                      </p>
                    </div>

                    {/* Mitigation Steps */}
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-white">
                          How to Mitigate
                        </h4>
                      </div>
                      <div className="space-y-3 ml-4">
                        {risk.mitigation_steps.map((step, stepIndex) => (
                          <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 + stepIndex * 0.1 }}
                            className="flex items-start gap-3"
                          >
                            <div className="w-5 h-5 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-green-400">{stepIndex + 1}</span>
                            </div>
                            <p className="text-sm text-neutral-300 leading-relaxed">
                              {step}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-300">Timeline:</span>
                        <span className="text-sm text-neutral-300">{risk.timeline}</span>
                      </div>
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
