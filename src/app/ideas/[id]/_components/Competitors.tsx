'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface Competitor {
  id: string
  name: string
  website: string
  pricing: string
  features: string[]
  yourAdvantage: string
  marketPosition: 'leader' | 'challenger' | 'niche'
}

interface CompetitorsProps {
  competitors: Competitor[]
}

export default function Competitors({ competitors }: CompetitorsProps) {

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

      {/* Competitors Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitors.map((competitor, index) => (
          <motion.div
            key={competitor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
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
              
              {/* Pricing */}
              <div className="bg-neutral-800/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-neutral-400">💰</span>
                  <span className="text-sm font-medium text-white">Pricing</span>
                </div>
                <p className="text-sm text-neutral-300">{competitor.pricing}</p>
              </div>
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
        ))}
      </div>

    </motion.div>
  )
}
