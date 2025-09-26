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

    // Step 2: Call OpenAI with retry logic
    const validatedResponse = await retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a senior business consultant specializing in strategic planning for startups.
You have deep expertise in:
- Startup evaluation & business model development
- Market & competition analysis
- Marketing & Sales strategies
- Operations & Technology planning
- Legal & Human Resources compliance
- Financial Management
- Business Strategy & Planning

Your task:
- Provide comprehensive, ethical, and legally-aware business assessments.
- Always ensure ideas are analyzed within the boundaries of law, ethics, and social responsibility.
- Reject or suggest pivots for ideas that are illegal, harmful, or unethical.
- Respond only in **valid JSON** with exactly **4 fields**:

{
  "problem": "...",
  "audience": "...",
  "solution": "...",
  "monetization": "..."
}`
          },
          {
            role: 'user',
            content: `Evaluate this business idea comprehensively and provide your analysis in the following sections:

Problem: Identify and articulate the key problems or challenges presented by this idea.
Audience: Define the target audience for the idea and discuss their needs and preferences.
Solution: Describe potential solutions to the identified problems, ensuring they are practical and innovative.
Monetization: Explore feasible business models for monetizing the idea effectively.

Please ensure your analysis adheres to the following requirements:

Evaluate the idea in terms of ethics, ensuring it is not harmful or discriminatory in any manner.
Consider the legal implications according to the applicable laws and regulations, specifying any legal constraints.
Exclude any ideas that are illegal or unethical, providing an explanation for their exclusion.

Additionally, provide friendly yet honest feedback on the viability of the idea:

If the idea is workable, outline the steps or opportunities required to implement it.
If it is not feasible, suggest possible modifications that could enhance its viability.

To complete your analysis, consider the overarching social and economic impact the idea may have.

Business idea: ${idea}

Return your analysis as a JSON object with exactly these 4 fields: problem, audience, solution, monetization. Each field should be a comprehensive yet concise analysis.`
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
