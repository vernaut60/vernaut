'use client'

import React, { useRef, useEffect, cloneElement } from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import RadioInput from './QuestionInputs/RadioInput'
import CheckboxInput from './QuestionInputs/CheckboxInput'
import SelectInput from './QuestionInputs/SelectInput'
import NumberInput from './QuestionInputs/NumberInput'

// Auto-expanding textarea component
function AutoExpandingTextarea({ value, error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string | null }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto'
      // Set height based on content (min 120px, max 400px)
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 400)
      textarea.style.height = `${newHeight}px`
    }
  }, [value])

  // Ensure value is explicitly passed (don't rely on spread alone)
  return (
    <Textarea
      ref={textareaRef}
      {...props}
      value={value ?? ''} // Explicitly set value to ensure it's rendered
      className={`text-base resize-none overflow-y-auto ${error ? 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/40' : ''}`}
      style={{ minHeight: '120px', maxHeight: '400px' }}
    />
  )
}

interface Question {
  id: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number'
  text: string
  required: boolean
  placeholder?: string
  help_text?: string
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

interface QuestionRendererProps {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
  error?: string | null
  isSaving?: boolean
  isSaved?: boolean
  isNextDisabled?: boolean
}

export default function QuestionRenderer({ question, value, onChange, error, isSaving, isSaved, isNextDisabled }: QuestionRendererProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <Input
            id={question.id}
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            minLength={question.validation?.minLength}
            maxLength={question.validation?.maxLength}
            pattern={question.validation?.pattern}
            className={`min-h-[44px] text-base ${error ? 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/40' : ''}`}
          />
        )

      case 'textarea':
        return (
          <AutoExpandingTextarea
            id={question.id}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            required={question.required}
            minLength={question.validation?.minLength}
            maxLength={question.validation?.maxLength}
            error={error}
          />
        )

      case 'radio':
        if (!question.options || question.options.length === 0) {
          return <p className="text-[var(--color-danger)] text-sm">No options provided for this question</p>
        }
        return (
          <RadioInput
            questionId={question.id}
            options={question.options}
            value={(value as string) || null}
            onChange={(val) => onChange(val)}
            required={question.required}
            error={error}
          />
        )

      case 'checkbox':
        if (!question.options || question.options.length === 0) {
          return <p className="text-[var(--color-danger)] text-sm">No options provided for this question</p>
        }
        return (
          <CheckboxInput
            questionId={question.id}
            options={question.options}
            value={(value as string[]) || null}
            onChange={(val) => onChange(val)}
            required={question.required}
            error={error}
          />
        )

      case 'select':
        if (!question.options || question.options.length === 0) {
          return <p className="text-[var(--color-danger)] text-sm">No options provided for this question</p>
        }
        return (
          <SelectInput
            questionId={question.id}
            options={question.options}
            value={(value as string) || null}
            onChange={(val) => onChange(val)}
            placeholder={question.placeholder}
            required={question.required}
            error={error}
          />
        )

      case 'number':
        return (
          <NumberInput
            questionId={question.id}
            value={(value as number) || null}
            onChange={(val) => onChange(val)}
            placeholder={question.placeholder}
            min={question.validation?.min}
            max={question.validation?.max}
            required={question.required}
            error={error}
          />
        )

      default:
        return <p className="text-[var(--color-danger)] text-sm">Unknown question type: {question.type}</p>
    }
  }

  // Generate IDs for accessibility
  const helpTextId = question.help_text ? `${question.id}-help` : undefined
  const errorId = error ? `${question.id}-error` : undefined
  const charCounterId = (question.type === 'text' || question.type === 'textarea') && question.validation?.maxLength 
    ? `${question.id}-counter` 
    : undefined
  
  // Combine all describedBy IDs
  const describedByIds = [helpTextId, errorId, charCounterId].filter(Boolean).join(' ')

  return (
    <div className="space-y-5">
      {/* Question Header - improved spacing and emphasis */}
      <div className="space-y-3">
        <label htmlFor={question.id} className="block text-lg sm:text-xl font-bold text-[var(--color-text)] leading-relaxed break-words">
          {question.text}
          {question.required && (
            <span className="text-[var(--color-danger)] ml-1" aria-label="required">*</span>
          )}
        </label>
        {question.help_text && (
          <p id={helpTextId} className="text-sm text-[var(--color-text-muted)] leading-relaxed">{question.help_text}</p>
        )}
      </div>

      {/* Input Component */}
      <div className="space-y-3">
        {/* Render input with aria-describedby for accessibility */}
        {(() => {
          const input = renderInput()
          // Add aria-describedby to text and textarea inputs
          if (question.type === 'text' || question.type === 'textarea') {
            return cloneElement(input as React.ReactElement, {
              'aria-describedby': describedByIds || undefined
            } as React.HTMLAttributes<HTMLElement>)
          }
          return input
        })()}

        {/* Validation microcopy for text/textarea - conversational tone */}
        {error && (question.type === 'text' || question.type === 'textarea') && (
          <p id={errorId} className="text-sm text-[var(--color-text-muted)] mt-1">{error}</p>
        )}

        {/* Character count and save indicator for text/textarea - below input */}
        {(question.type === 'text' || question.type === 'textarea') && question.validation?.maxLength && (
          <div className="flex items-center justify-between gap-2">
            {(isSaving || isSaved) && (
              <div className="text-xs flex items-center gap-1.5">
                {isSaving ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-[var(--color-border)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[var(--color-text-muted)]">Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[var(--color-success)]">✓</span>
                    <span className="text-[var(--color-success)]">Saved</span>
                  </>
                )}
              </div>
            )}
            <div className="flex flex-col items-end gap-0.5 ml-auto">
              <p id={charCounterId} className="text-xs text-[var(--color-text-muted)]">
                {((value as string) || '').length} / {question.validation.maxLength} characters
              </p>
              {/* Show characters needed when Next button is disabled due to minLength */}
              {isNextDisabled && question.validation?.minLength && typeof value === 'string' && (
                <p className="text-xs text-[var(--color-primary-500)] font-medium">
                  Add {Math.max(0, question.validation.minLength - value.length)} more {question.validation.minLength - value.length === 1 ? 'character' : 'characters'} to continue
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Save indicator for other question types */}
      {question.type !== 'text' && question.type !== 'textarea' && (isSaving || isSaved) && (
        <div className="text-xs flex items-center gap-1.5">
          {isSaving ? (
            <>
              <div className="w-2.5 h-2.5 border border-[var(--color-border)] border-t-transparent rounded-full animate-spin" />
              <span className="text-[var(--color-text-muted)]">Saving...</span>
            </>
          ) : (
            <>
              <span className="text-[var(--color-success)]">✓</span>
              <span className="text-[var(--color-success)]">Saved</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

