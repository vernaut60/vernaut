import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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
    created_at: z.string()
  })),
  meta: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    remaining: z.number()
  })
})

// Extract user ID from JWT token
const extractUserIdFromJWT = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create authenticated Supabase client with the token
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAuth = createClient(
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
  
  const { data: { user }, error } = await supabaseAuth.auth.getUser()
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  return user.id
}

// Error logging utility
const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(`[IDEAS_API_ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== /api/ideas called ===')

    // Step 1: Extract and validate authentication
    console.log('Step 1: Validating authentication...')
    const authHeader = request.headers.get('Authorization')
    const userId = await extractUserIdFromJWT(authHeader)
    console.log('Authenticated user_id:', userId)

    // Step 2: Parse query parameters
    console.log('Step 2: Parsing query parameters...')
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Validate parameters
    const validatedParams = requestSchema.parse({ limit, offset })
    console.log('Validated params:', validatedParams)

    // Step 3: Query database for user's ideas
    console.log('Step 3: Fetching user ideas...')
    
    // Create authenticated Supabase client for database operations
    const { createClient } = await import('@supabase/supabase-js')
    const token = authHeader?.replace('Bearer ', '') || ''
    
    const supabaseAuth = createClient(
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
    
    const { data: ideas, error: fetchError, count } = await supabaseAuth
      .from('ideas')
      .select(`
        id,
        idea_text,
        title,
        score,
        risk_score,
        risk_analysis,
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

    console.log(`Found ${ideas?.length || 0} ideas for user`)

    // Step 4: Transform data to handle nullable fields
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
        created_at: idea.created_at
      }
    })

    // Step 5: Calculate metadata
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

    // Step 5: Validate response
    const validatedResponse = responseSchema.parse(response)
    console.log('Validated response:', { 
      success: validatedResponse.success, 
      ideaCount: validatedResponse.ideas.length,
      total: validatedResponse.meta.total 
    })

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
