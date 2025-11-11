'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface SectionHeaderProps {
  icon?: string
  title: string
  description?: string
  gradientFrom?: string
  gradientTo?: string
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

export default function SectionHeader({
  icon,
  title,
  description,
  gradientFrom = 'from-purple-400',
  gradientTo = 'to-pink-400',
  className = '',
  titleClassName = 'text-lg sm:text-xl md:text-2xl',
  descriptionClassName = ''
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`mb-8 ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-1 h-8 bg-gradient-to-b ${gradientFrom} ${gradientTo} rounded-full flex-shrink-0`}></div>
        {icon ? (
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl flex-shrink-0">{icon}</span>
            <h2 className={`${titleClassName} font-bold text-white`}>
              {title}
            </h2>
          </div>
        ) : (
          <h2 className={`${titleClassName} font-bold text-white`}>
            {title}
          </h2>
        )}
      </div>
      {description && (
        <p className={`text-neutral-400 text-sm sm:text-base ${descriptionClassName}`}>
          {description}
        </p>
      )}
    </motion.div>
  )
}

