'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

interface NavigationButtonsProps {
  canGoBack: boolean
  canGoForward: boolean
  isLastQuestion: boolean
  onBack: () => void
  onNext: () => void
  onComplete: () => void
  isSubmitting?: boolean
  isNextDisabled?: boolean
}

export default function NavigationButtons({
  canGoBack,
  canGoForward,
  isLastQuestion,
  onBack,
  onNext,
  onComplete,
  isSubmitting = false,
  isNextDisabled = false
}: NavigationButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-6 pb-4 divider-subtle">
      <div className="w-full sm:w-auto">
        {canGoBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            type="button"
            className="w-full sm:w-auto"
          >
            ← Back
          </Button>
        )}
      </div>
      
      <div className="w-full sm:w-auto flex-1 sm:flex-initial">
        {isLastQuestion ? (
          <Button
            variant="primary"
            onClick={onComplete}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            type="button"
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">{isSubmitting ? 'Submitting...' : 'Complete & Generate Analysis'}</span>
            <span className="sm:hidden">{isSubmitting ? 'Submitting...' : 'Complete'}</span>
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!canGoForward || isSubmitting || isNextDisabled}
            type="button"
            className="w-full sm:w-auto"
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  )
}

