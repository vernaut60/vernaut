'use client'

import React from 'react'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[var(--color-muted)] rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-accent-600)] h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

