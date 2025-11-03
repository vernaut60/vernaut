'use client'

import React from 'react'

interface NumberInputProps {
  questionId: string
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  min?: number
  max?: number
  required?: boolean
  error?: string | null
}

export default function NumberInput({ questionId, value, onChange, placeholder, min, max, required, error }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange(null)
    } else {
      const num = Number(val)
      if (!isNaN(num)) {
        onChange(num)
      }
    }
  }

  const handleIncrement = () => {
    const current = value ?? (min ?? 0)
    const newValue = current + 1
    if (max === undefined || newValue <= max) {
      onChange(newValue)
    }
  }

  const handleDecrement = () => {
    const current = value ?? (min ?? 0)
    const newValue = current - 1
    if (min === undefined || newValue >= min) {
      onChange(newValue)
    }
  }

  const canIncrement = max === undefined || (value ?? (min ?? 0)) < max
  const canDecrement = min === undefined || (value ?? (min ?? 0)) > min

  return (
    <div>
      <div className="relative flex items-center">
        <input
          id={questionId}
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          required={required}
          className={`
            input-base w-full min-h-[44px] text-base
            pr-12
            [appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
            ${error ? 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/40' : ''}
          `}
        />
        
        {/* Custom increment/decrement buttons */}
        <div className="absolute right-2 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={!canIncrement}
            className={`
              w-6 h-5 flex items-center justify-center rounded
              transition-colors
              ${canIncrement 
                ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-muted)]' 
                : 'text-[var(--color-text-muted)]/30 cursor-not-allowed'
              }
            `}
            aria-label="Increment"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={!canDecrement}
            className={`
              w-6 h-5 flex items-center justify-center rounded
              transition-colors
              ${canDecrement 
                ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-muted)]' 
                : 'text-[var(--color-text-muted)]/30 cursor-not-allowed'
              }
            `}
            aria-label="Decrement"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-[var(--color-danger)] mt-1">{error}</p>
      )}
      {(min !== undefined || max !== undefined) && (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          {min !== undefined && max !== undefined 
            ? `Range: ${min} - ${max}`
            : min !== undefined 
              ? `Minimum: ${min}`
              : `Maximum: ${max}`
          }
        </p>
      )}
    </div>
  )
}

