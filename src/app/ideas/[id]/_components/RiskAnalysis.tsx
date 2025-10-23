'use client'

import React from 'react'
import { motion } from 'framer-motion'

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

  const getBarColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'from-green-500 to-green-400'
    if (percentage >= 60) return 'from-yellow-500 to-yellow-400'
    return 'from-red-500 to-red-400'
  }

  const getRiskLevel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'Low Risk'
    if (percentage >= 60) return 'Medium Risk'
    return 'High Risk'
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
          <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Risk Analysis
            </h2>
          </div>
        </div>
        <p className="text-neutral-400 text-sm sm:text-base ml-4">
          Comprehensive breakdown of potential challenges and market risks
        </p>
      </motion.div>

      {/* Risk Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {category.name}
                </h3>
                <p className="text-sm text-neutral-400">
                  {category.description}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getRiskLevel(category.score, category.maxScore) === 'Low Risk' ? 'bg-green-100 text-green-700' :
                    getRiskLevel(category.score, category.maxScore) === 'Medium Risk' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {getRiskLevel(category.score, category.maxScore)}
                  </span>
                  <span className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm font-medium">
                    {category.score}/{category.maxScore}
                  </span>
                  {/* Show change if available */}
                  {category.change !== undefined && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      category.change > 0 ? 'bg-red-100 text-red-700' :
                      category.change < 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {category.change > 0 ? '+' : ''}{category.change}
                    </span>
                  )}
                </div>
                {/* Show reason for change */}
                {category.reason && (
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs text-right">
                    {category.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">Risk Level</span>
                <span className="text-sm text-neutral-300">
                  {Math.round((category.score / category.maxScore) * 100)}%
                </span>
              </div>
              <div className="w-full bg-neutral-700/50 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(category.score / category.maxScore) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.2, ease: "easeOut" }}
                  className={`h-2 rounded-full bg-gradient-to-r ${getBarColor(category.score, category.maxScore)}`}
                />
              </div>
            </div>

            {/* Risk Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                getRiskLevel(category.score, category.maxScore) === 'Low Risk' ? 'bg-green-400' :
                getRiskLevel(category.score, category.maxScore) === 'Medium Risk' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm text-neutral-300">
                {getRiskLevel(category.score, category.maxScore)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  )
}
