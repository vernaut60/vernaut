'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface LoadingStateProps {
  message?: string
  subMessage?: string
}

export default function LoadingState({ 
  message = 'Generating questions...',
  subMessage = 'This usually takes about 30 seconds'
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="w-16 h-16 border-4 border-[var(--color-primary-500)]/30 border-t-[var(--color-primary-500)] rounded-full animate-spin" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">{message}</h2>
        {subMessage && (
          <p className="text-[var(--color-text-muted)] text-sm">{subMessage}</p>
        )}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-8"
      >
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-[var(--color-primary-500)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </motion.div>
    </div>
  )
}

