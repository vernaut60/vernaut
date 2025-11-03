'use client'

import React from 'react'

interface CheckboxInputProps {
  questionId: string
  options: string[]
  value: string[] | null
  onChange: (value: string[]) => void
  required?: boolean
  error?: string | null
}

export default function CheckboxInput({ questionId, options, value, onChange, required, error }: CheckboxInputProps) {
  const selectedValues = value || []

  const handleToggle = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, option])
    } else {
      onChange(selectedValues.filter(v => v !== option))
    }
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isChecked = selectedValues.includes(option)
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
              type="checkbox"
              name={questionId}
              value={option}
              checked={isChecked}
              onChange={(e) => handleToggle(option, e.target.checked)}
              className="mt-0.5 sm:mt-0.5 w-5 h-5 sm:w-4 sm:h-4 text-[var(--color-primary-500)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary-500)]/40 focus:ring-2 flex-shrink-0"
              required={required && selectedValues.length === 0}
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

