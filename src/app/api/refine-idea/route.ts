import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Input validation schema
const requestSchema = z.object({
  idea: z.string().min(1, 'Idea text is required').max(1000, 'Idea text too long'),
})

// OpenAI response validation schema
const aiResponseSchema = z.object({
  problem: z.string().min(1, 'Problem field is required'),
  audience: z.string().min(1, 'Audience field is required'),
  solution: z.string().min(1, 'Solution field is required'),
  monetization: z.string().min(1, 'Monetization field is required'),
})

// Retry utility function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate request
    const body = await request.json()
    const { idea } = requestSchema.parse(body)

    // Step 2: Call OpenAI with retry logic
    const validatedResponse = await retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst that breaks down ideas into structured components. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: `Analyze this business idea and break it down into a JSON object with exactly these 4 fields: problem, audience, solution, monetization.

Business idea: ${idea}

Each field should be a clear, concise sentence.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
      })

      const aiResponse = completion.choices[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Step 3: Validate response with Zod
      const parsedResponse = JSON.parse(aiResponse)
      return aiResponseSchema.parse(parsedResponse)
    })

    // Step 4: Insert into Supabase with retry logic
    const record = await retryWithBackoff(async () => {
      const { data, error: dbError } = await supabase
        .from('ideas')
        .insert({
          idea_text: idea,
          problem: validatedResponse.problem,
          audience: validatedResponse.audience,
          solution: validatedResponse.solution,
          monetization: validatedResponse.monetization,
          user_id: null, // TODO: Add user authentication
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`)
      }

      return data
    })

    // Step 5: Return success response
    return NextResponse.json({
      success: true,
      idea: record
    })

  } catch (error) {
    console.error('Error in refine-idea API:', error)

    // Simplified error responses for frontend
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please check your input and try again'
        },
        { status: 400 }
      )
    }

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('Database error')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to save your idea. Please try again.'
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('No response from AI')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is temporarily unavailable. Please try again.'
        },
        { status: 500 }
      )
    }

    // Generic error for anything else
    return NextResponse.json(
      {
        success: false,
        error: 'Something went wrong. Please try again.'
      },
      { status: 500 }
    )
  }
}
