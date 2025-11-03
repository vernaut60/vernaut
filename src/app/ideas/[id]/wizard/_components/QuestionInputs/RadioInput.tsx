'use client'

import React from 'react'

interface RadioInputProps {
  questionId: string
  options: string[]
  value: string | null
  onChange: (value: string) => void
  required?: boolean
  error?: string | null
}

export default function RadioInput({ questionId, options, value, onChange, required, error }: RadioInputProps) {
  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isChecked = value === option
        return (
          <label
            key={option}
            className={`
              flex items-start gap-3 p-3 sm:p-4 rounded-lg border cursor-pointer transition-all
              min-h-[44px] touch-manipulation
              ${isChecked 
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 ring-1 ring-[var(--color-primary-500)]/20' 
                : 'border-[var(--color-border)] bg-[var(--color-muted)] hover:bg-[var(--color-muted-strong)] active:bg-[var(--color-muted-strong)]'
              }
              ${error ? 'border-[var(--color-danger)]/50' : ''}
            `}
          >
            <input
              type="radio"
              name={questionId}
              value={option}
              checked={isChecked}
              onChange={() => onChange(option)}
              className="mt-0.5 sm:mt-0.5 w-5 h-5 sm:w-4 sm:h-4 text-[var(--color-primary-500)] border-[var(--color-border)] focus:ring-[var(--color-primary-500)]/40 focus:ring-2 flex-shrink-0"
              required={required}
            />
            <span className="text-[var(--color-text)] flex-1 text-sm sm:text-base break-words leading-relaxed">{option}</span>
          </label>
        )
      })}
      {error && (
        <p className="text-sm text-[var(--color-danger)] mt-1">{error}</p>
      )}
    </div>
  )
}

