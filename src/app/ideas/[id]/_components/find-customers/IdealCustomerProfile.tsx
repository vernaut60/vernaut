'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { SectionHeader } from '../common'

interface PainPoint {
  icon?: string
  title: string
  description: string
}

interface CategoryItem {
  icon?: string
  text: string
  frequency?: string
}

interface Category {
  category: string
  icon?: string
  description?: string
  items: string[] | CategoryItem[]
}

interface IdealCustomerProfileProps {
  section: string
  title: string
  introduction: string
  whoTheyAre: {
    title: string
    demographics: {
      title: string
      content: string
    }
    authority: {
      title: string
      content: string
    }
  }
  painPoints: {
    title: string
    points: PainPoint[]
  }
  buyingTriggers: {
    title: string
    intro: string
    triggers: string[] | Array<{ text: string; tags: string[] }>
  }
  whereTheySpendTime: {
    title: string
    intro?: string
    categories: Category[]
  }
  bottomNote: {
    icon: string
    text: string
  }
}

export default function IdealCustomerProfile({
  title,
  introduction,
  whoTheyAre,
  painPoints,
  buyingTriggers,
  whereTheySpendTime,
  bottomNote
}: IdealCustomerProfileProps) {
  // Helper function to render markdown-style bold (**text**) and highlight numbers
  const renderDescription = (text: string) => {
    // First, handle markdown bold (**text**)
    const boldPattern = /\*\*(.*?)\*\*/g
    const parts: (string | React.ReactElement)[] = []
    let lastIndex = 0
    let match
    let keyCounter = 0
    
    boldPattern.lastIndex = 0
    
    while ((match = boldPattern.exec(text)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      // Add the bold text
      parts.push(
        <strong key={`bold-${keyCounter++}`} className="text-white font-semibold">
          {match[1]}
        </strong>
      )
      lastIndex = boldPattern.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : [text]
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
        title={title}
        description={introduction}
        gradientFrom="from-blue-400"
        gradientTo="to-indigo-400"
        titleClassName="text-2xl sm:text-3xl"
        descriptionClassName="ml-4"
        className="mb-8"
      />

      {/* Who They Are - Visual Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-12"
      >
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-white">{whoTheyAre.title}</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:border-r sm:border-white/10 sm:pr-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">{whoTheyAre.demographics.title}</span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">{whoTheyAre.demographics.content}</p>
            </div>
            <div className="space-y-2 sm:pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-green-300 uppercase tracking-wide">{whoTheyAre.authority.title}</span>
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">{whoTheyAre.authority.content}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pain Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-12"
      >
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-4">
            {painPoints.title}
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {painPoints.points.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                {point.icon && <span className="text-lg">{point.icon}</span>}
                <span>{point.title}</span>
              </h4>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {renderDescription(point.description)}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Buying Triggers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-12"
      >
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold text-white">{buyingTriggers.title}</h3>
          </div>
          <p className="text-sm text-neutral-400 mb-5">
            {buyingTriggers.intro}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {buyingTriggers.triggers.map((trigger, index) => {
              // Handle both string and object formats for backward compatibility
              const triggerText = typeof trigger === 'string' ? trigger : trigger.text
              const triggerTags = typeof trigger === 'string' ? [] : trigger.tags

              // Map tag labels to colors
              const getTagColor = (tag: string) => {
                const tagLower = tag.toLowerCase()
                if (tagLower.includes('seasonal')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                if (tagLower.includes('pain') || tagLower.includes('urgent')) return 'bg-red-500/20 text-red-400 border-red-500/30'
                if (tagLower.includes('social')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                if (tagLower.includes('growth') || tagLower.includes('planning')) return 'bg-green-500/20 text-green-400 border-green-500/30'
                if (tagLower.includes('event') || tagLower.includes('environmental')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                return 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50'
              }

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                >
                  <span className="text-green-400 mt-0.5 font-semibold flex-shrink-0 text-lg">✓</span>
                  <div className="flex-1 min-w-0">
                    {triggerTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {triggerTags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-neutral-300 leading-relaxed block">{triggerText}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Where They Spend Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="mb-12"
      >
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">
            {whereTheySpendTime.title}
          </h3>
          {whereTheySpendTime.intro && (
            <p className="text-sm text-neutral-400 leading-relaxed">
              {whereTheySpendTime.intro}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {whereTheySpendTime.categories.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + categoryIndex * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                {category.icon && <span className="text-lg">{category.icon}</span>}
                <h4 className="text-base font-semibold text-white">
                  {category.category}
                </h4>
              </div>
              {category.description && (
                <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                  {category.description}
                </p>
              )}
              <ul className="space-y-3">
                {category.items.map((item, itemIndex) => {
                  const itemText = typeof item === 'string' ? item : item.text
                  const itemIcon = typeof item === 'string' ? null : item.icon
                  const frequency = typeof item === 'string' ? null : (item.frequency || null)
                  
                  // Simplified frequency badges - use neutral colors to reduce visual noise
                  const freqColors: Record<string, string> = {
                    daily: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
                    weekly: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
                    monthly: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
                    quarterly: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
                    annually: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50',
                    yearly: 'bg-neutral-700/50 text-neutral-300 border-neutral-600/50'
                  }
                  
                  return (
                    <li key={itemIndex} className="flex items-start gap-2">
                      {itemIcon ? (
                        <span className="mt-0.5 flex-shrink-0 text-base">{itemIcon}</span>
                      ) : (
                        <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-neutral-300 block leading-relaxed">{itemText}</span>
                        {frequency && (
                          <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block font-medium border ${
                            freqColors[frequency.toLowerCase()] || 'bg-neutral-700/50 text-neutral-400 border-neutral-600/50'
                          }`}>
                            {frequency}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Note */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="bg-gradient-to-r from-[#4361EE]/10 to-indigo-500/10 border border-[#4361EE]/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{bottomNote.icon}</span>
          <p className="text-sm text-neutral-300">
            {bottomNote.text}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
