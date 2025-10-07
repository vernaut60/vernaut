import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const openaiApiKey = process.env.OPENAI_API_KEY

if (!openaiApiKey) {
  throw new Error('Missing environment variable: OPENAI_API_KEY')
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
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

    // Step 1.5: Lightweight precheck for obviously insufficient inputs
    if (idea.trim().split(' ').length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Please describe your idea in a bit more detail (a few words is enough).'
      }, { status: 400 })
    }

    // Step 2: Validate whether the idea is business-relevant
    const validationPrompt = `
You are a strict validator that classifies if a text is a potential business idea.
Output ONLY one of these labels:

- "valid_idea" → clearly describes a product, service, app, or startup concept.
- "vague" → too short, unclear, or not descriptive enough.
- "non_business" → personal statement, random phrase, insult, or unrelated to business.

Text: "${idea.trim()}"
`

    const validationResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: validationPrompt }],
      temperature: 0,
      max_tokens: 5,
    })

    const verdict = validationResponse.choices[0]?.message?.content?.trim().toLowerCase()

    if (verdict === 'vague') {
      return NextResponse.json(
        {
          success: false,
          error: '⚠️ Your idea seems too vague. Try describing what it does or who it helps.',
        },
        { status: 400 }
      )
    }

    if (verdict === 'non_business') {
      return NextResponse.json(
        {
          success: false,
          error: '💡 This doesn\'t look like a business idea. Try describing a product or service concept.',
        },
        { status: 400 }
      )
    }

    // Step 3: Call OpenAI with retry logic
    const validatedResponse = await retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a senior business consultant specializing in startups.
Always return JSON with exactly these 4 fields:
{ "problem": "...", "audience": "...", "solution": "...", "monetization": "..." }
- Ensure ideas are legal, ethical, and socially responsible.
- If idea is vague, rewrite it into a clearer form before analysis.
- Keep responses concise but meaningful (2–3 sentences per field).`
          },
          {
            role: 'user',
            content: `Analyze this idea: "${idea}"`
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
          user_id: null, // TODO: Implement user authentication
          // Strategy: Use Supabase Auth with JWT tokens
          // 1. Extract user from request headers: const { data: { user } } = await supabase.auth.getUser(jwt)
          // 2. Set user_id: user?.id || null (supports both authenticated and anonymous users)
          // 3. Update RLS policies if needed for user-specific access
          // Timeline: Phase 2 - after MVP validation
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
