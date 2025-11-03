'use client'

import React, { useState, useRef, useEffect } from 'react'

interface SelectInputProps {
  questionId: string
  options: string[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string | null
}

export default function SelectInput({ questionId, options, value, onChange, placeholder, required, error }: SelectInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedOption = value || ''

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleSelect = (option: string) => {
    onChange(option)
    setIsOpen(false)
  }

  const displayValue = selectedOption || placeholder || 'Select an option...'

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden native select for form submission */}
      <select
        id={questionId}
        value={selectedOption}
        onChange={() => {}}
        required={required}
        className="sr-only"
        aria-hidden="true"
      >
        <option value="">{placeholder || 'Select an option...'}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {/* Custom dropdown button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          input-base w-full min-h-[44px] text-base text-left
          flex items-center justify-between gap-2
          ${error ? 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/40' : ''}
          ${!selectedOption ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={displayValue}
      >
        <span className="flex-1 truncate">{displayValue}</span>
        <svg
          className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden">
          <ul
            className="max-h-60 overflow-auto"
            role="listbox"
          >
            {options.map((option, index) => {
              const isSelected = option === selectedOption
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors duration-150
                    ${isSelected 
                      ? 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-500)]' 
                      : 'text-[var(--color-text)] hover:bg-[var(--color-muted-strong)]'
                    }
                    ${index === 0 ? '' : 'border-t border-[var(--color-border)]'}
                  `}
                >
                  {option}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--color-danger)] mt-1">{error}</p>
      )}
    </div>
  )
}

