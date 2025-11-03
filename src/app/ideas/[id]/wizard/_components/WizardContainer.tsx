'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface WizardContainerProps {
  children: React.ReactNode
  className?: string
}

export default function WizardContainer({ children, className = '' }: WizardContainerProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] ${className}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-8 sm:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}

