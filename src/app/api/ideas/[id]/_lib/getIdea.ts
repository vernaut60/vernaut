import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthenticatedClient } from './auth'
import { logError } from './logger'
import { getIdeaResponseSchema } from './schemas'

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
export async function getIdea(
  request: NextRequest,
  params: Promise<{ id: string }>
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
      // Check if this is a "not found" error (0 rows returned from .single())
      // PostgREST returns "Cannot coerce the result to a single JSON object" when .single() gets 0 rows
      const isNotFound = 
        fetchError.code === 'PGRST116' || 
        fetchError.message?.includes('Cannot coerce the result to a single JSON object') ||
        fetchError.message?.includes('JSON object requested, multiple (or no) rows returned')
      
      if (isNotFound) {
        // Not found is expected (idea doesn't exist or not owned by user) - don't log as error
        return NextResponse.json({
          success: false,
          message: 'Idea not found'
        }, { status: 404 })
      }
      
      // Actual database error - log it
      logError('Database fetch error', { 
        userId, 
        ideaId,
        error: fetchError.message,
        code: fetchError.code
      })
      
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

