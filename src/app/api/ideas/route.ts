import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { startQuestionGeneration } from '@/lib/questionGeneration'
import { validateIdeaIsNotVague } from '@/lib/ideaValidation'

// Input validation schema
const requestSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0)
})

// Response validation schema
const responseSchema = z.object({
  success: z.boolean(),
  ideas: z.array(z.object({
    id: z.string(),
    idea_text: z.string(),
    title: z.string(),
    score: z.number().nullable(),
    risk_score: z.number().nullable(),
    risk_level: z.string().nullable().optional(),
    // Wizard fields
    status: z.string(),
    wizard_answers: z.record(z.unknown()).nullable().optional(),
    current_step: z.number().nullable().optional(),
    total_questions: z.number().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    created_at: z.string()
  })),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    remaining: z.number()
  })
})

// POST request validation schema
const createIdeaSchema = z.object({
  idea_text: z.string()
    .min(10, 'Idea must be at least 10 characters')
    .max(500, 'Idea must be no more than 500 characters')
})

// POST response validation schema
const createIdeaResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  status: z.string()
})

// Create authenticated Supabase client (reused for both auth and DB queries)
const createAuthenticatedClient = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  const { createClient } = await import('@supabase/supabase-js')
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

export async function GET(request: NextRequest) {
  try {
    // Step 1: Parse query parameters first (fast, no I/O)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Validate parameters
    const validatedParams = requestSchema.parse({ limit, offset })

    // Step 2: Extract auth header and create single Supabase client (reused for both auth check and DB query)
    const authHeader = request.headers.get('Authorization')
    const supabase = await createAuthenticatedClient(authHeader)
    
    // Step 3: Authenticate and get user ID (using same client)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Invalid or expired token')
    }

    const userId = user.id
    
    // Step 4: Query database using same client
    const { data: ideas, error: fetchError, count } = await supabase
      .from('ideas')
      .select(`
        id,
        idea_text,
        title,
        score,
        risk_score,
        risk_analysis,
        status,
        wizard_answers,
        current_step,
        total_questions,
        updated_at,
        created_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(validatedParams.offset, validatedParams.offset + validatedParams.limit - 1)

    if (fetchError) {
      logError('Database fetch error', { 
        userId, 
        error: fetchError.message,
        limit: validatedParams.limit,
        offset: validatedParams.offset
      })
      throw new Error(`Database error: ${fetchError.message}`)
    }

    // Step 5: Transform data to handle nullable fields
    const transformedIdeas = (ideas || []).map((idea: Record<string, unknown>) => {
      // Extract risk_level from the full JSONB object
      const riskAnalysis = idea.risk_analysis as Record<string, unknown> || {}
      const jsonbRiskLevel = riskAnalysis.risk_level
      const riskScore = idea.risk_score as number || 0
      const calculatedRiskLevel = riskScore <= 3.9 ? 'Low' : riskScore <= 6.9 ? 'Medium' : 'High'
      const finalRiskLevel = jsonbRiskLevel || calculatedRiskLevel
      
      return {
        id: idea.id,
        idea_text: idea.idea_text as string,
        // Use title if available, fallback to truncated idea_text
        title: idea.title || ((idea.idea_text as string).length > 60 ? (idea.idea_text as string).substring(0, 60) + '...' : idea.idea_text as string),
        score: idea.score,
        risk_score: idea.risk_score,
        // Use risk_level from JSONB, fallback to calculation if null
        risk_level: finalRiskLevel,
        // Wizard fields
        status: idea.status || 'draft',
        wizard_answers: idea.wizard_answers || null,
        current_step: idea.current_step ?? null,
        total_questions: idea.total_questions ?? null,
        updated_at: idea.updated_at ?? null,
        created_at: idea.created_at
      }
    })

    // Step 6: Calculate metadata and build response
    const total = count || 0
    const remaining = Math.max(0, total - validatedParams.offset - (ideas?.length || 0))
    
    const response = {
      success: true,
      ideas: transformedIdeas,
      meta: {
        total,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        remaining
      }
    }

    // Step 7: Validate response and return
    const validatedResponse = responseSchema.parse(response)
    return NextResponse.json(validatedResponse)

  } catch (error) {
    console.error('Error in ideas API:', error)

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request parameters',
        errors: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error) {
      // Authentication errors
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

      // Database errors
      if (error.message.includes('Database error')) {
        return NextResponse.json({
          success: false,
          message: 'Unable to retrieve ideas. Please try again.'
        }, { status: 503 })
      }

      // Network/timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return NextResponse.json({
          success: false,
          message: 'Request timed out. Please try again.'
        }, { status: 408 })
      }

      // Rate limiting
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json({
          success: false,
          message: 'Too many requests. Please wait a moment and try again.'
        }, { status: 429 })
      }
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve ideas. Please try again.'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    const validatedInput = createIdeaSchema.parse(body)
    const ideaText = validatedInput.idea_text.trim()

    // Step 2: Validate idea is not too vague (same as demo validation)
    const validationResult = await validateIdeaIsNotVague(ideaText)
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        message: validationResult.error || 'Idea validation failed'
      }, { status: 400 })
    }

    // Step 3: Extract auth header and create Supabase client
    const authHeader = request.headers.get('Authorization')
    const supabase = await createAuthenticatedClient(authHeader)

    // Step 4: Authenticate and get user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logError('Authentication failed', { error: authError?.message })
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired authentication token'
      }, { status: 401 })
    }

    const userId = user.id

    // Step 4.5: Rate limiting is handled in startQuestionGeneration

    // Step 5: Create idea with status "generating_questions"
    const { data: idea, error: insertError } = await supabase
      .from('ideas')
      .insert({
        idea_text: ideaText,
        user_id: userId,
        status: 'generating_questions',
        wizard_answers: {},
        current_step: 0,
        // Analysis fields are nullable - will be populated from wizard answers or Stage 1 analysis
        problem: null,
        audience: null,
        solution: null,
        monetization: null
      })
      .select('id, status, created_at')
      .single()

    if (insertError) {
      logError('Failed to create idea', {
        userId,
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      })

      // Handle unique constraint violation (duplicate idea)
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: false,
          message: 'You already have an idea with this text. Please modify it slightly.'
        }, { status: 409 })
      }

      // Handle schema/column errors (migration not applied)
      if (insertError.code === 'PGRST204' || insertError.message.includes('column') || insertError.message.includes('schema cache')) {
        return NextResponse.json({
          success: false,
          message: 'Database schema is out of date. Please refresh the page and try again. If the issue persists, contact support.',
          details: 'This usually means a database migration needs to be applied.'
        }, { status: 500 })
      }

      // Return more detailed error for debugging (in development)
      const errorMessage = process.env.NODE_ENV === 'development' 
        ? `Database error: ${insertError.message} (Code: ${insertError.code})`
        : 'Failed to create idea. Please try again.'

      return NextResponse.json({
        success: false,
        message: errorMessage
      }, { status: 500 })
    }

    // Step 6: Start question generation using shared utility
    const generationResult = await startQuestionGeneration(
      idea.id,
      ideaText,
      userId,
      supabase,
      authHeader
    )

    if (!generationResult.success) {
      // If rate limited or other error, return appropriate response
      const statusCode = generationResult.error?.includes('too many') ? 429 : 500
      return NextResponse.json({
        success: false,
        id: idea.id,
        status: 'generation_failed',
        message: generationResult.error || 'Failed to start question generation'
      }, { status: statusCode })
    }
    
    logInfo('Question generation started', {
      idea_id: idea.id,
      user_id: userId,
      idea_text_length: ideaText.length
    })

    // Step 7: Return immediately with idea_id and status
    const response = {
      success: true,
      id: idea.id,
      status: idea.status
    }

    const validatedResponse = createIdeaResponseSchema.parse(response)
    return NextResponse.json(validatedResponse, { status: 201 })

  } catch (error) {
    logError('Error in POST /api/ideas', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: error.errors[0]?.message || 'Invalid request data',
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
      message: 'Failed to create idea. Please try again.'
    }, { status: 500 })
  }
}
