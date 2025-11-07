import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Input validation schema
const handoffSchema = z.object({
  guest_session_id: z.string().min(1, 'Guest session ID is required'),
  idempotency_key: z.string().optional() // Optional idempotency key for request deduplication
})

// Response validation schema
const responseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  ideas_transferred: z.number().optional(),
  limit_reached: z.boolean().optional(),
  ideas: z.array(z.object({
    id: z.string(),
    user_id: z.string(),
    idea_text: z.string(),
    problem: z.string(),
    audience: z.string(),
    solution: z.string(),
    monetization: z.string(),
    ai_insights: z.any().optional(),
    score: z.number().optional(),
    risk_score: z.number().optional(),
    risk_analysis: z.any().optional(),
    created_at: z.string()
  })).optional()
})

// Error logging utility
const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(`[HANDOFF_ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

// Retry utility with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('Invalid authorization') ||
            error.message.includes('Invalid or expired token') ||
            error.message.includes('User already has ideas')) {
          throw error
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`[HANDOFF_RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Extract user ID from JWT token
const extractUserIdFromJWT = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Create authenticated Supabase client
  const supabase = createClient(
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
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  return user.id
}

// Transfer the latest guest idea to user's ideas table
const transferGuestIdeas = async (guestSessionId: string, userId: string, authToken: string) => {
  // Create authenticated Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    }
  )

  // Get the latest guest idea for this session with retry logic
  const guestIdeasResult = await retryWithBackoff(async () => {
    const result = await supabase
      .from('guest_ideas')
      .select('*')
      .eq('guest_session_id', guestSessionId)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (result.error) {
      throw new Error(`Database fetch error: ${result.error.message}`)
    }
    
    return result
  })

  const { data: guestIdeas, error: fetchError } = guestIdeasResult

  if (fetchError) {
    const errorMessage = (fetchError as { message?: string }).message || 'Unknown error'
    logError('Failed to fetch guest ideas after retries', { 
      guestSessionId, 
      error: errorMessage 
    })
    throw new Error(`Failed to fetch guest ideas: ${errorMessage}`)
  }

  if (!guestIdeas || guestIdeas.length === 0) {
    return { transferred: 0, ideas: [], limit_reached: false }
  }

  // Check if user already has ideas with retry logic
  const existingIdeasResult = await retryWithBackoff(async () => {
    const result = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', userId)
    
    if (result.error) {
      throw new Error(`Database check error: ${result.error.message}`)
    }
    
    return result
  })

  const { data: existingIdeas, error: checkError } = existingIdeasResult

  if (checkError) {
    const errorMessage = (checkError as { message?: string }).message || 'Unknown error'
    logError('Failed to check existing ideas after retries', { 
      userId, 
      error: errorMessage 
    })
    throw new Error(`Failed to check existing ideas: ${errorMessage}`)
  }

  if (existingIdeas && existingIdeas.length >= 5) {
    return { 
      transferred: 0, 
      ideas: [],
      message: 'User already has 5 or more ideas, skipping transfer',
      limit_reached: true
    }
  }

  // Transfer the latest guest idea with all fields
  const ideaToInsert = {
    user_id: userId,
    idea_text: guestIdeas[0].idea_text,
    title: guestIdeas[0].title,
    problem: guestIdeas[0].problem,
    audience: guestIdeas[0].audience,
    solution: guestIdeas[0].solution,
    monetization: guestIdeas[0].monetization,
    ai_insights: guestIdeas[0].ai_insights,
    score: guestIdeas[0].score,
    risk_score: guestIdeas[0].risk_score,
    risk_analysis: guestIdeas[0].risk_analysis
  }

  const insertResult = await retryWithBackoff(async () => {
    const result = await supabase
      .from('ideas')
      .insert(ideaToInsert)
      .select()
      .single()
    
    if (result.error) {
      // Handle specific database constraint violations
      if (result.error.code === '23505') { // Unique constraint violation
        console.log('🔄 Idea already exists for this user, skipping duplicate')
        return { 
          data: null, 
          error: null 
        }
      }
      throw new Error(`Database insert error: ${result.error.message}`)
    }
    
    return result
  })

  const { data: transferredIdea, error: insertError } = insertResult

  if (insertError) {
    const errorMessage = (insertError as { message?: string }).message || 'Unknown error'
    const errorCode = (insertError as { code?: string }).code || 'UNKNOWN'
    logError('Failed to transfer guest ideas after retries', { 
      userId, 
      guestSessionId,
      error: errorMessage,
      code: errorCode
    })
    throw new Error(`Failed to transfer ideas: ${errorMessage}`)
  }

  // Handle case where idea already exists (duplicate)
  if (!transferredIdea) {
    console.log('ℹ️ Idea already exists for this user, no transfer needed')
    return { 
      transferred: 0, 
      ideas: [],
      message: 'Idea already exists for this user'
    }
  }

  return { 
    transferred: 1, 
    ideas: [transferredIdea],
    limit_reached: false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== /api/demo/handoff called ===')

    // Step 1: Validate request
    console.log('Step 1: Parsing request body...')
    const body = await request.json()
    console.log('Request body:', body)

    const { guest_session_id, idempotency_key } = handoffSchema.parse(body)
    console.log('Validated guest_session_id:', guest_session_id)
    console.log('Idempotency key:', idempotency_key)

    // Step 2: Extract user ID from JWT
    console.log('Step 2: Extracting user ID from JWT...')
    const authHeader = request.headers.get('Authorization')
    const userId = await extractUserIdFromJWT(authHeader)
    console.log('Extracted user_id:', userId)

    // Step 3: Transfer guest ideas
    console.log('Step 3: Transferring guest ideas...')
    const authToken = authHeader!.replace('Bearer ', '')
    const result = await transferGuestIdeas(guest_session_id, userId, authToken)
    console.log('Transfer result:', result)

    // Step 4: Prepare response
    const response = {
      success: true,
      message: result.message || `Successfully transferred ${result.transferred} guest idea`,
      ideas_transferred: result.transferred,
      limit_reached: result.limit_reached || false,
      ideas: result.ideas
    }

    // Validate response
    const validatedResponse = responseSchema.parse(response)
    console.log('Validated response:', validatedResponse)

    return NextResponse.json(validatedResponse)

  } catch (error) {
    console.error('Error in handoff API:', error)

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error) {
      // Authentication errors
      if (error.message.includes('Invalid authorization header')) {
        return NextResponse.json({
          success: false,
          message: 'Invalid or missing authorization header'
        }, { status: 401 })
      }

      if (error.message.includes('Invalid or expired token')) {
        return NextResponse.json({
          success: false,
          message: 'Invalid or expired authentication token'
        }, { status: 401 })
      }

      // Business logic errors
      if (error.message.includes('User already has ideas')) {
        return NextResponse.json({
          success: false,
          message: 'User already has ideas, skipping transfer',
          ideas_transferred: 0
        }, { status: 200 }) // 200 because this is expected behavior
      }

      // Database errors
      if (error.message.includes('Database fetch error')) {
        return NextResponse.json({
          success: false,
          message: 'Unable to retrieve guest ideas. Please try again.'
        }, { status: 503 })
      }

      if (error.message.includes('Database check error')) {
        return NextResponse.json({
          success: false,
          message: 'Unable to verify user account. Please try again.'
        }, { status: 503 })
      }

      if (error.message.includes('Database insert error')) {
        return NextResponse.json({
          success: false,
          message: 'Unable to save idea to your account. Please try again.'
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

      // Duplicate key errors
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json({
          success: false,
          message: 'This idea already exists in your account.'
        }, { status: 409 })
      }
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to transfer guest ideas. Please try again.'
    }, { status: 500 })
  }
}
