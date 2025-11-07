import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

// Response validation schema (flexible to support conditional fields)
const getIdeaResponseSchema = z.object({
  success: z.boolean(),
  idea: z.object({
    id: z.string(),
    status: z.string(),
    idea_text: z.string(),
    // Wizard fields (optional - only when requested or wizard active)
    questions: z.array(z.unknown()).nullable().optional(),
    wizard_answers: z.record(z.unknown()).optional(),
    current_step: z.number().optional(),
    total_questions: z.number().nullable().optional(),
    questions_generated_at: z.string().nullable().optional(),
    wizard_completed_at: z.string().nullable().optional(),
    // Stage 1 fields (optional - only when requested or complete)
    score: z.number().nullable().optional(),
    risk_score: z.number().nullable().optional(),
    risk_analysis: z.record(z.unknown()).nullable().optional(),
    ai_insights: z.record(z.unknown()).nullable().optional(),
    problem: z.string().nullable().optional(),
    audience: z.string().nullable().optional(),
    solution: z.string().nullable().optional(),
    monetization: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    // Competitors (optional - only when requested)
    competitors: z.array(z.unknown()).optional(),
    // Timestamps
    created_at: z.string(),
    updated_at: z.string().nullable().optional(),
    // Error fields
    error_message: z.string().nullable().optional(),
    error_occurred_at: z.string().nullable().optional()
  })
})

// PATCH request validation schema
const patchIdeaSchema = z.object({
  wizard_answers: z.record(z.unknown()).optional(),
  current_step: z.number().min(0).optional(),
  status: z.enum(['generating_questions']).optional() // Only allow draft -> generating_questions transition
})

// PATCH response validation schema
const patchIdeaResponseSchema = z.object({
  success: z.boolean(),
  updated_at: z.string()
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
  console.error(`[IDEAS_API_ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

// Info logging utility
const logInfo = (message: string, context: Record<string, unknown> = {}) => {
  console.log(`[IDEAS_API_INFO] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

/**
 * GET /api/ideas/[id]
 * 
 * Fetches a single idea with conditional data based on status and query parameters.
 * 
 * Query Parameters:
 * - ?include=wizard,stage1,competitors (comma-separated, all optional)
 * 
 * Default Behavior (smart defaults based on status):
 * - Wizard active (status in ['generating_questions', 'questions_ready', 'generation_failed']):
 *   → Includes wizard data (questions, answers, current_step)
 * - Stage 1 complete (status = 'complete'):
 *   → Includes stage1 data + competitors
 * - Stage 1 generating/failed:
 *   → Minimal data (just status)
 * 
 * Returns:
 * - Core idea fields (always)
 * - Wizard fields (when requested or wizard active)
 * - Stage 1 fields (when requested or complete)
 * - Competitors (when requested or stage1 complete)
 */
export async function GET(
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

    // Step 2: Parse query parameters (Next.js 15 pattern: use URL constructor)
    const { searchParams } = new URL(request.url)
    const includeParam = searchParams.get('include')
    const requestedIncludes = includeParam ? includeParam.split(',').map(s => s.trim()) : []

    // Step 3: Authenticate user
    const authHeader = request.headers.get('Authorization')
    const supabase = await createAuthenticatedClient(authHeader)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logError('Authentication failed', { error: authError?.message, ideaId })
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired authentication token'
      }, { status: 401 })
    }

    const userId = user.id

    // Step 4: Fetch idea and verify ownership (include all fields we might need)
    const { data: idea, error: fetchError } = await supabase
      .from('ideas')
      .select(`
        id,
        status,
        idea_text,
        questions,
        wizard_answers,
        current_step,
        total_questions,
        questions_generated_at,
        wizard_completed_at,
        score,
        risk_score,
        risk_analysis,
        ai_insights,
        problem,
        audience,
        solution,
        monetization,
        title,
        created_at,
        updated_at,
        error_message,
        error_occurred_at
      `)
      .eq('id', ideaId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      logError('Database fetch error', { 
        userId, 
        ideaId,
        error: fetchError.message
      })
      
      // If not found, could be wrong ID or not owned by user
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

    // Step 4: Check conditional request headers (ETag and If-Modified-Since)
    // Generate ETag from idea data
    const etag = `"${idea.id}-${idea.updated_at || idea.created_at}"`
    
    // Check If-None-Match header (ETag-based conditional request)
    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch === etag) {
      // Resource hasn't changed - return 304 without body
      return new NextResponse(null, { status: 304 })
    }
    
    // Check If-Modified-Since header (date-based conditional request)
    const ifModifiedSince = request.headers.get('If-Modified-Since')
    if (ifModifiedSince && idea.updated_at) {
      const lastModified = new Date(idea.updated_at).getTime()
      const clientTime = new Date(ifModifiedSince).getTime()
      
      if (lastModified <= clientTime) {
        // Idea hasn't changed - return 304 without body
        return new NextResponse(null, { status: 304 })
      }
    }

    // Step 5: Determine what to include based on status and query params
    // Status groups for conditional logic
    const WIZARD_STATUSES = ['generating_questions', 'questions_ready', 'generation_failed']
    const STAGE1_COMPLETE_STATUS = 'complete'
    
    // Smart defaults based on status
    const isWizardActive = WIZARD_STATUSES.includes(idea.status)
    const isStage1Complete = idea.status === STAGE1_COMPLETE_STATUS && !!idea.score
    
    // Determine final includes (query params override defaults)
    const defaultIncludes = isWizardActive 
      ? ['wizard'] 
      : isStage1Complete 
        ? ['stage1', 'competitors'] 
        : []
    
    const finalIncludes = requestedIncludes.length > 0 ? requestedIncludes : defaultIncludes
    
    // Step 6: Build base response with core fields
    const response: {
      success: boolean
      idea: Record<string, unknown>
    } = {
      success: true,
      idea: {
        id: idea.id,
        status: idea.status,
        idea_text: idea.idea_text,
        created_at: idea.created_at,
        updated_at: idea.updated_at ?? null
      }
    }
    
    // Step 7: Conditionally include wizard data
    // Include if in finalIncludes (either requested or default based on status)
    if (finalIncludes.includes('wizard')) {
      response.idea.questions = idea.questions || null
      response.idea.wizard_answers = idea.wizard_answers || {}
      response.idea.current_step = idea.current_step ?? 0
      response.idea.total_questions = idea.total_questions ?? null
      response.idea.questions_generated_at = idea.questions_generated_at ?? null
      response.idea.wizard_completed_at = idea.wizard_completed_at ?? null
    }
    
    // Step 8: Conditionally include Stage 1 data
    if (finalIncludes.includes('stage1')) {
      if (idea.score !== null) response.idea.score = idea.score
      if (idea.risk_score !== null) response.idea.risk_score = idea.risk_score
      if (idea.risk_analysis) response.idea.risk_analysis = idea.risk_analysis
      if (idea.ai_insights) response.idea.ai_insights = idea.ai_insights
      if (idea.problem) response.idea.problem = idea.problem
      if (idea.audience) response.idea.audience = idea.audience
      if (idea.solution) response.idea.solution = idea.solution
      if (idea.monetization) response.idea.monetization = idea.monetization
      if (idea.title) response.idea.title = idea.title
      // Include wizard_completed_at to determine if fields are from demo or wizard
      if (idea.wizard_completed_at !== undefined) {
        response.idea.wizard_completed_at = idea.wizard_completed_at ?? null
      }
    }
    
    // Step 9: Conditionally fetch and include competitors
    if (finalIncludes.includes('competitors')) {
      try {
        const { data: competitors, error: competitorsError } = await supabase
          .from('competitors')
          .select('*')
          .eq('idea_id', ideaId)
          .order('threat_level', { ascending: false })
        
        if (!competitorsError && competitors) {
          response.idea.competitors = competitors
        }
      } catch (competitorsErr) {
        logError('Failed to fetch competitors', {
          ideaId,
          error: competitorsErr instanceof Error ? competitorsErr.message : String(competitorsErr)
        })
        // Don't fail the request if competitors fetch fails
        response.idea.competitors = []
      }
    }
    
    // Step 10: Include error fields if present
    if (idea.error_message) {
      response.idea.error_message = idea.error_message
      response.idea.error_occurred_at = idea.error_occurred_at ?? null
    }

    // Step 11: Validate response
    const validatedResponse = getIdeaResponseSchema.parse(response)
    
    // Step 12: Create response and set headers
    const httpResponse = NextResponse.json(validatedResponse)
    
    // Cache control based on generation status
    if (idea.status === 'generating_questions' || 
        idea.status === 'generating_stage1') {
      // Still generating - don't cache (polling needs fresh data)
      httpResponse.headers.set('Cache-Control', 'no-store, must-revalidate')
    } else {
      // Generation complete - cache for 60 seconds
      httpResponse.headers.set('Cache-Control', 'private, max-age=60')
    }
    
    // Rate limit headers (for polling endpoints: 60 requests per minute)
    httpResponse.headers.set('X-RateLimit-Limit', '60')
    httpResponse.headers.set('X-RateLimit-Remaining', '58') // Placeholder - would need rate limiting logic for dynamic value
    httpResponse.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 60)) // Unix timestamp (60 seconds from now)
    
    // ETag header for conditional requests (preferred over Last-Modified)
    // Frontend can use If-None-Match header to avoid unnecessary data transfer
    httpResponse.headers.set('ETag', etag)
    
    // Last-Modified header for conditional requests (ETag alternative)
    // Frontend can use If-Modified-Since header to avoid unnecessary data transfer
    if (idea.updated_at) {
      httpResponse.headers.set('Last-Modified', new Date(idea.updated_at).toUTCString())
    }
    
    return httpResponse

  } catch (error) {
    logError('Error in GET /api/ideas/[id]', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid response format',
        errors: error.errors
      }, { status: 500 })
    }

    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid authorization header')) {
        return NextResponse.json({
          success: false,
          message: 'Missing or invalid authorization header'
        }, { status: 401 })
      }

      if (error.message.includes('Invalid or expired token')) {
        return NextResponse.json({
          success: false,
          message: 'Invalid or expired authentication token'
        }, { status: 401 })
      }
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve idea. Please try again.'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/ideas/[id]
 * 
 * Auto-saves wizard answers and current step.
 * Called by frontend with debouncing (1 second after user stops typing).
 * Merges answers with existing data (doesn't overwrite).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
