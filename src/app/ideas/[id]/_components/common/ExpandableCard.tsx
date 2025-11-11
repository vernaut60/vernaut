'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ExpandableCardProps {
  id: string
  header: React.ReactNode
  preview?: React.ReactNode // Shown when collapsed
  children: React.ReactNode // Shown when expanded
  defaultExpanded?: boolean
  className?: string
  headerClassName?: string
  contentClassName?: string
  showDivider?: boolean
}

export default function ExpandableCard({
  header,
  preview,
  children,
  defaultExpanded = false,
  className = '',
  headerClassName = '',
  contentClassName = '',
  showDivider = true
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white/5 border border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      {/* Header - Clickable */}
      <div 
        className={`p-4 cursor-pointer hover:bg-white/5 transition-colors duration-200 ${headerClassName}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {header}
            {/* Preview text - only shown when collapsed */}
            {!isExpanded && preview && (
              <div className="mt-3">
                {preview}
              </div>
            )}
          </div>
          
          {/* Expand/Collapse Button */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-neutral-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {showDivider && (
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            )}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={`p-4 bg-white/5 ${contentClassName}`}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

