import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedClient } from './auth'
import { logError, logInfo } from './logger'
import { patchIdeaSchema, patchIdeaResponseSchema } from './schemas'

/**
 * PATCH /api/ideas/[id]
 * 
 * Auto-saves wizard answers and current step.
 * Called by frontend with debouncing (1 second after user stops typing).
 * Merges answers with existing data (doesn't overwrite).
 */
export async function updateIdea(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    // Step 1: Extract idea ID from params
    const { id: ideaId } = await params
    
    if (!ideaId || typeof ideaId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid idea ID'
      }, { status: 400 })
    }

    // Step 2: Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    const validatedInput = patchIdeaSchema.parse(body)
    
    // Must provide at least one field to update
    if (!validatedInput.wizard_answers && validatedInput.current_step === undefined && !validatedInput.status) {
      return NextResponse.json({
        success: false,
        message: 'Must provide wizard_answers, current_step, or status to update'
      }, { status: 400 })
    }

    // Step 3: Authenticate user (with timeout handling)
    const authHeader = request.headers.get('Authorization')
    let supabase
    let user
    
    try {
      supabase = await createAuthenticatedClient(authHeader)
      const authResult = await supabase.auth.getUser()
      
      if (authResult.error || !authResult.data.user) {
        logError('Authentication failed in PATCH', { 
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
        logError('Connection timeout during authentication in PATCH', {
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
        logError('Network error during authentication in PATCH', {
          ideaId,
          error: errorMessage,
          cause: errorCause
        })
        return NextResponse.json({
          success: false,
          message: 'Network error. Please check your connection and try again.'
        }, { status: 503 })
      }
      
      // Generic authentication error
      logError('Authentication error in PATCH', {
        ideaId,
        error: errorMessage,
        cause: errorCause
      })
      return NextResponse.json({
        success: false,
        message: 'Authentication failed. Please try again.'
      }, { status: 401 })
    }

    if (!user || !supabase) {
      return NextResponse.json({
        success: false,
        message: 'Authentication failed'
      }, { status: 401 })
    }

    const userId = user.id

    // Step 4: Fetch idea and verify ownership (with timeout handling)
    let idea
    let fetchError
    
    try {
      const fetchResult = await supabase
        .from('ideas')
        .select('id, status, wizard_answers, current_step, user_id, updated_at, idea_text')
        .eq('id', ideaId)
        .eq('user_id', userId)
        .single()
      
      idea = fetchResult.data
      fetchError = fetchResult.error
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      
      // Check for connection timeout errors
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connect Timeout') ||
        errorMessage.includes('UND_ERR_CONNECT_TIMEOUT')
      ) {
        logError('Connection timeout during database fetch in PATCH', {
          ideaId,
          userId,
          error: errorMessage
        })
        return NextResponse.json({
          success: false,
          message: 'Connection timeout. Your progress has been saved locally. Please try again in a moment.'
        }, { status: 408 })
      }
      
      // Network errors
      if (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch')
      ) {
        logError('Network error during database fetch in PATCH', {
          ideaId,
          userId,
          error: errorMessage
        })
        return NextResponse.json({
          success: false,
          message: 'Network error. Your progress has been saved locally. Please check your connection and try again.'
        }, { status: 503 })
      }
      
      // Re-throw if not a timeout/network error
      throw dbError
    }

    if (fetchError) {
      logError('Database fetch error in PATCH', { 
        userId, 
        ideaId,
        error: fetchError.message
      })
      
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          message: 'Idea not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve idea'
      }, { status: 500 })
    }

    if (!idea) {
      return NextResponse.json({
        success: false,
        message: 'Idea not found'
      }, { status: 404 })
    }

    // Step 5: Handle status update (draft -> generating_questions)
    if (validatedInput.status === 'generating_questions') {
      // Only allow status update if current status is 'draft'
      if (idea.status !== 'draft') {
        return NextResponse.json({
          success: false,
          message: `Cannot start question generation. Idea status is "${idea.status}". Only draft ideas can start question generation.`
        }, { status: 400 })
      }

      // Use idea_text from already-fetched idea
      const ideaText = (idea.idea_text as string) || ''
      
      if (!ideaText) {
        logError('Idea text is missing for question generation', { ideaId })
        return NextResponse.json({
          success: false,
          message: 'Idea text is required for question generation'
        }, { status: 400 })
      }

      // Import and use shared utility
      const { startQuestionGeneration } = await import('@/lib/questionGeneration')
      
      const generationResult = await startQuestionGeneration(
        ideaId,
        ideaText,
        userId,
        supabase,
        authHeader
      )

      if (!generationResult.success) {
        const statusCode = generationResult.error?.includes('too many') ? 429 : 500
        return NextResponse.json({
          success: false,
          message: generationResult.error || 'Failed to start question generation'
        }, { status: statusCode })
      }

      // Fetch updated idea to get new updated_at
      const { data: updatedIdea } = await supabase
        .from('ideas')
        .select('updated_at')
        .eq('id', ideaId)
        .single()

      return NextResponse.json({
        success: true,
        updated_at: updatedIdea?.updated_at || new Date().toISOString()
      })
    }

    // Step 6: Handle normal wizard updates (wizard_answers, current_step)
    // Validate status - only allow updates when questions are ready
    const allowedStatuses = ['questions_ready', 'generating_stage1', 'stage1_failed', 'complete']
    if (!allowedStatuses.includes(idea.status)) {
      return NextResponse.json({
        success: false,
        message: `Cannot update answers. Idea status is "${idea.status}". Questions must be ready first.`
      }, { status: 400 })
    }

    // Step 7: Prepare update data
    const updateData: {
      wizard_answers?: Record<string, unknown>
      current_step?: number
    } = {}

    // Merge wizard_answers with existing (don't overwrite completely)
    if (validatedInput.wizard_answers !== undefined) {
      const existingAnswers = (idea.wizard_answers as Record<string, unknown>) || {}
      updateData.wizard_answers = {
        ...existingAnswers,
        ...validatedInput.wizard_answers
      }
    }

    // Update current_step if provided
    if (validatedInput.current_step !== undefined) {
      updateData.current_step = validatedInput.current_step
    }

    // Step 8: Update idea in database (with timeout handling)
    let updatedIdea
    let updateError
    
    try {
      const updateResult = await supabase
        .from('ideas')
        .update(updateData)
        .eq('id', ideaId)
        .eq('user_id', userId)
        .select('updated_at')
        .single()
      
      updatedIdea = updateResult.data
      updateError = updateResult.error
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError)
      
      // Check for connection timeout errors
      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Connect Timeout') ||
        errorMessage.includes('UND_ERR_CONNECT_TIMEOUT')
      ) {
        logError('Connection timeout during database update in PATCH', {
          ideaId,
          userId,
          error: errorMessage
        })
        return NextResponse.json({
          success: false,
          message: 'Connection timeout. Your progress has been saved locally. Please try again in a moment.'
        }, { status: 408 })
      }
      
      // Network errors
      if (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch')
      ) {
        logError('Network error during database update in PATCH', {
          ideaId,
          userId,
          error: errorMessage
        })
        return NextResponse.json({
          success: false,
          message: 'Network error. Your progress has been saved locally. Please check your connection and try again.'
        }, { status: 503 })
      }
      
      // Re-throw if not a timeout/network error
      throw dbError
    }

    if (updateError) {
      logError('Database update error in PATCH', {
        userId,
        ideaId,
        error: updateError.message,
        errorCode: updateError.code
      })
      return NextResponse.json({
        success: false,
        message: 'Failed to update idea. Please try again.'
      }, { status: 500 })
    }

    // Step 7.5: Log auto-save for analytics
    logInfo('Wizard answers auto-saved', {
      idea_id: ideaId,
      user_id: userId,
      answers_count: Object.keys(validatedInput.wizard_answers || {}).length,
      current_step: validatedInput.current_step
    })

    // Step 8: Build and validate response
    const response = {
      success: true,
      updated_at: updatedIdea?.updated_at || new Date().toISOString()
    }

    const validatedResponse = patchIdeaResponseSchema.parse(response)
    const httpResponse = NextResponse.json(validatedResponse)
    
    // Add headers
    httpResponse.headers.set('X-Auto-Save', 'true')
    if (updatedIdea?.updated_at) {
      httpResponse.headers.set('X-Updated-At', updatedIdea.updated_at)
    }
    
    return httpResponse

  } catch (error) {
    logError('Error in PATCH /api/ideas/[id]', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 })
    }

    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid authorization header')) {
        return NextResponse.json({
          success: false,
          message: 'Missing or invalid authorization header'
        }, { status: 401 })
      }
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to update idea. Please try again.'
    }, { status: 500 })
  }
}

