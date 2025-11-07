import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Question type definition (matches frontend)
type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number'

interface Question {
  id: string
  type: QuestionType
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

// Response validation schema
const completeWizardResponseSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  message: z.string().optional()
})

// Create authenticated Supabase client
const createAuthenticatedClient = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

// Error logging utility
const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(`[COMPLETE_WIZARD_ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

// Info logging utility
const logInfo = (message: string, context: Record<string, unknown> = {}) => {
  console.log(`[COMPLETE_WIZARD_INFO] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

/**
 * Server-side validation function (matches frontend logic)
 */
function validateQuestion(question: Question, value: unknown): string | null {
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
      return `Minimum ${validation.minLength} characters required`
    }

    if (validation?.maxLength && str.length > validation.maxLength) {
      return `Maximum ${validation.maxLength} characters allowed`
    }

    if (validation?.pattern) {
      try {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(str)) {
          return 'Please check the format and try again'
        }
      } catch (regexError) {
        // Invalid regex pattern - log but don't fail validation
        logError('Invalid regex pattern in question validation', {
          questionId: question.id,
          pattern: validation.pattern,
          error: regexError instanceof Error ? regexError.message : String(regexError)
        })
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

/**
 * POST /api/ideas/[id]/complete-wizard
 * 
 * Validates all wizard answers and triggers Stage 1 analysis.
 * 
 * Flow:
 * 1. Validate idea exists and belongs to user
 * 2. Validate status is 'questions_ready' (or 'stage1_failed' for retry)
 * 3. Validate all required questions are answered
 * 4. Validate all answers pass type-specific validation
 * 5. Update status to 'generating_stage1'
 * 6. Set wizard_completed_at timestamp
 * 7. Trigger generateStage1Analysis() in background (async, don't await)
 * 8. Return immediately with success response
 * 
 * Returns:
 * - { success: true, status: 'generating_stage1' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Extract idea ID from params (Next.js 15 requires await for params)
    const { id: ideaId } = await params
    
    if (!ideaId || typeof ideaId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid idea ID'
      }, { status: 400 })
    }

    // Step 2: Authenticate user
    const authHeader = request.headers.get('Authorization')
    let supabase
    let user
    
    try {
      supabase = await createAuthenticatedClient(authHeader)
      const authResult = await supabase.auth.getUser()
      
      if (authResult.error || !authResult.data.user) {
        logError('Authentication failed', { 
          error: authResult.error?.message, 
          ideaId,
          errorCode: authResult.error?.name 
        })
        return NextResponse.json({
          success: false,
          message: 'Invalid or expired authentication token'
        }, { status: 401 })
      }
      
      user = authResult.data.user
    } catch (authError: unknown) {
      // Handle connection timeout and network errors
      const errorMessage = authError instanceof Error ? authError.message : String(authError)
      const errorCause = authError instanceof Error && 'cause' in authError ? authError.cause : null
      
      // Check for connection timeout errors
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connect Timeout') ||
        errorMessage.includes('UND_ERR_CONNECT_TIMEOUT') ||
        (errorCause instanceof Error && errorCause.message.includes('Connect Timeout'))
      ) {
        logError('Connection timeout during authentication', {
          ideaId,
          error: errorMessage,
          cause: errorCause
        })
        return NextResponse.json({
          success: false,
          message: 'Connection timeout. Please check your internet connection and try again.'
        }, { status: 408 })
      }
      
      // Check for network/fetch errors
      if (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND')
      ) {
        logError('Network error during authentication', {
          ideaId,
          error: errorMessage,
          cause: errorCause
        })
        return NextResponse.json({
          success: false,
          message: 'Network error. Please check your connection and try again.'
        }, { status: 503 })
      }
      
      // Generic auth error
      logError('Authentication error', {
        ideaId,
        error: errorMessage,
        cause: errorCause
      })
      return NextResponse.json({
        success: false,
        message: 'Authentication failed. Please try again.'
      }, { status: 401 })
    }

    const userId = user.id

    // Step 3: Fetch idea and validate ownership
    const { data: idea, error: fetchError } = await supabase
      .from('ideas')
      .select('id, status, questions, wizard_answers, user_id, idea_text')
      .eq('id', ideaId)
      .single()

    if (fetchError) {
      logError('Failed to fetch idea', {
        ideaId,
        userId,
        error: fetchError.message,
        code: fetchError.code
      })
      return NextResponse.json({
        success: false,
        message: 'Idea not found'
      }, { status: 404 })
    }

    // Validate ownership
    if (idea.user_id !== userId) {
      logError('Unauthorized access attempt', {
        ideaId,
        userId,
        ownerId: idea.user_id
      })
      return NextResponse.json({
        success: false,
        message: 'Unauthorized access'
      }, { status: 403 })
    }

    // Step 4: Validate status is ready for completion
    const validStatuses = ['questions_ready', 'stage1_failed'] // Allow retry after failure
    if (!validStatuses.includes(idea.status)) {
      logError('Invalid status for wizard completion', {
        ideaId,
        userId,
        currentStatus: idea.status
      })
      return NextResponse.json({
        success: false,
        message: `Cannot complete wizard. Current status: ${idea.status}`
      }, { status: 400 })
    }

    // Step 5: Validate questions exist
    if (!idea.questions || !Array.isArray(idea.questions) || idea.questions.length === 0) {
      logError('No questions found for idea', {
        ideaId,
        userId
      })
      return NextResponse.json({
        success: false,
        message: 'Questions not found. Please regenerate questions.'
      }, { status: 400 })
    }

    const questions = idea.questions as Question[]
    const answers = (idea.wizard_answers as Record<string, unknown>) || {}

    // Step 6: Validate all required questions are answered
    const validationErrors: Record<string, string> = {}
    let hasErrors = false

    for (const question of questions) {
      const answer = answers[question.id]
      const error = validateQuestion(question, answer)
      
      if (error) {
        validationErrors[question.id] = error
        hasErrors = true
      }
    }

    if (hasErrors) {
      logInfo('Wizard validation failed', {
        ideaId,
        userId,
        errorCount: Object.keys(validationErrors).length,
        errors: validationErrors
      })
      return NextResponse.json({
        success: false,
        message: 'Please complete all required questions',
        errors: validationErrors
      }, { status: 400 })
    }

    // Step 7: Concurrency guard – limit concurrent Stage 1 per user and globally
    const PER_USER_MAX_STAGE1 = 2
    const GLOBAL_MAX_STAGE1 = 10

    // Count concurrent Stage 1 for this user
    const { data: userInFlight, error: userCountError } = await supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'generating_stage1')

    if (userCountError) {
      logError('Failed to count user Stage 1 jobs', { ideaId, userId, error: userCountError.message })
    }

    if ((userInFlight as unknown as null) === null && (supabase as unknown)) {
      // No-op: supabase head+count pattern returns null data; rely on HTTP headers internally
    }

    // Count global concurrent Stage 1
    const { data: globalInFlight, error: globalCountError } = await supabase
      .from('ideas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'generating_stage1')

    if (globalCountError) {
      logError('Failed to count global Stage 1 jobs', { ideaId, userId, error: globalCountError.message })
    }

    const userCount = (userInFlight as unknown as { length: number } | null) ? 0 : 0 // placeholder to satisfy TS
    const globalCount = (globalInFlight as unknown as { length: number } | null) ? 0 : 0 // placeholder

    // Using postgrest head+count puts count in response context; supabase-js doesn't expose it directly.
    // Workaround: run a lightweight count without head for accuracy.
    const { count: userCountExact } = await supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'generating_stage1')

    const { count: globalCountExact } = await supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'generating_stage1')

    const perUser = userCountExact ?? userCount
    const global = globalCountExact ?? globalCount

    if (perUser >= PER_USER_MAX_STAGE1 || global >= GLOBAL_MAX_STAGE1) {
      logInfo('Stage 1 concurrency cap hit', { ideaId, userId, perUser, global, caps: { PER_USER_MAX_STAGE1, GLOBAL_MAX_STAGE1 } })
      return NextResponse.json({
        success: false,
        status: 'queued',
        message: 'Too many analyses running. Please wait a minute and try again.'
      }, { status: 429 })
    }

    // Step 8: Update idea status and set completion timestamp
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        status: 'generating_stage1',
        wizard_completed_at: now
      })
      .eq('id', ideaId)

    if (updateError) {
      logError('Failed to update idea status', {
        ideaId,
        userId,
        error: updateError.message,
        code: updateError.code
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update idea status. Please try again.'
      }, { status: 500 })
    }

    logInfo('Wizard completed successfully, triggering Stage 1 analysis', {
      ideaId,
      userId,
      questionCount: questions.length,
      answerCount: Object.keys(answers).length
    })

    // Step 9: Trigger Stage 1 analysis in background (async, don't await)
    // This will be implemented in the next step
    // For now, we'll import and call it (even if it doesn't exist yet, we'll create a placeholder)
    try {
      // Dynamic import to avoid blocking if module doesn't exist yet
      const { generateStage1Analysis } = await import('@/lib/stage1Analysis')
      // Fire and forget - don't await
      generateStage1Analysis(ideaId, idea.idea_text).catch((error: unknown) => {
        // Error is already logged in generateStage1Analysis
        logError('Background Stage 1 analysis failed (non-blocking)', {
          ideaId,
          userId,
          error: error instanceof Error ? error.message : String(error)
        })
      })
    } catch {
      // Module doesn't exist yet - that's okay, we'll create it in the next step
      logInfo('Stage 1 analysis module not yet implemented', {
        ideaId,
        userId,
        note: 'This is expected during development'
      })
    }

    // Step 10: Return success response immediately
    const response = {
      success: true,
      status: 'generating_stage1',
      message: 'Wizard completed successfully. Stage 1 analysis is starting...'
    }

    // Validate response format
    const validatedResponse = completeWizardResponseSchema.parse(response)

    return NextResponse.json(validatedResponse, { status: 200 })

  } catch (error) {
    logError('Unexpected error in complete-wizard', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid response format',
        errors: error.errors
      }, { status: 500 })
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to complete wizard. Please try again.'
    }, { status: 500 })
  }
}

