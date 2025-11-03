interface Question {
  id: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number'
  required: boolean
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

export function validateQuestion(question: Question, value: unknown): string | null {
  // Required check
  if (question.required) {
    if (value === null || value === undefined || value === '') {
      return 'This field is required'
    }
    
    // For arrays (checkbox), check if empty
    if (Array.isArray(value) && value.length === 0) {
      return 'Please select at least one option'
    }
  }

  // Skip validation if value is empty (unless required, which we already checked)
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Type-specific validation
  if (question.type === 'text' || question.type === 'textarea') {
    const str = String(value)
    const validation = question.validation

    if (validation?.minLength && str.length < validation.minLength) {
      const remaining = validation.minLength - str.length
      return `Minimum ${validation.minLength} characters required. ${remaining} more needed.`
    }

    if (validation?.maxLength && str.length > validation.maxLength) {
      return `Maximum ${validation.maxLength} characters allowed.`
    }

    if (validation?.pattern) {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(str)) {
        return 'Please check the format and try again'
      }
    }
  }

  if (question.type === 'number') {
    const num = Number(value)
    
    if (isNaN(num)) {
      return 'Must be a valid number'
    }

    const validation = question.validation

    if (validation?.min !== undefined && num < validation.min) {
      return `Must be at least ${validation.min}`
    }

    if (validation?.max !== undefined && num > validation.max) {
      return `Must be no more than ${validation.max}`
    }
  }

  return null // Valid
}

