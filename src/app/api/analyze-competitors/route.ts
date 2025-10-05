import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import crypto from 'crypto'

// Very basic in-memory rate limiter per IP (best-effort; resets on cold starts)
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const rateBuckets: Map<string, { windowStart: number; count: number }> = new Map()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Zod schemas for validation
const competitorSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  category: z.string().min(1, 'Category is required'),
  stage: z.string().min(1, 'Funding stage is required'),
  users: z.string().optional(),
  funding: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

const analysisSchema = z.object({
  count: z.number().min(3).max(8, 'Count must be between 3-8'),
  categories: z.array(z.string().min(1)).min(2).max(4, 'Must have 2-4 categories'),
  competitors: z.array(competitorSchema).min(3).max(8, 'Must have 3-8 competitors'),
})

// type Competitor = z.infer<typeof competitorSchema>
type CompetitorAnalysis = z.infer<typeof analysisSchema>

export async function POST(request: NextRequest) {
  try {
    // Basic rate limiting per IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const now = Date.now()
    const bucket = rateBuckets.get(clientIp)
    if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateBuckets.set(clientIp, { windowStart: now, count: 1 })
    } else {
      bucket.count += 1
      if (bucket.count > RATE_LIMIT_MAX) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again shortly.' },
          { status: 429 }
        )
      }
    }

    const { idea } = await request.json()

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Idea is required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const prompt = `You are a business analyst specializing in competitive landscape analysis. 

For this startup idea: "${idea.trim()}"

Analyze the competitive landscape and provide:

1. Estimate how many direct competitors exist (choose between 3-8)
2. Identify 2-4 main categories these competitors fall into
3. Generate 3-5 realistic competitor names with details

For each competitor, provide:
- Company name (realistic, industry-appropriate)
- Category (one of the main categories you identified)
- Funding stage (Seed, Series A, Series B, Series C, Public, Bootstrapped, etc.)
- User metrics (e.g., "10K+ users", "500K+ downloads", "1M+ customers")
- Funding amount (e.g., "$2M raised", "$50M Series B", "Bootstrapped")
- Brief description (1-2 sentences about what they do)

Return ONLY a valid JSON object with this exact structure:
{
  "count": number,
  "categories": ["category1", "category2", "category3"],
  "competitors": [
    {
      "name": "Company Name",
      "category": "Category",
      "stage": "Funding Stage",
      "users": "User Metrics",
      "funding": "Funding Amount",
      "description": "Brief description"
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. Always respond with valid JSON only. Do not include any text outside the JSON object. Be precise and structured in your response.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent structured output
      max_tokens: 1200 // Reduced to prevent overshooting
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response with safer extraction
    let rawAnalysis: Record<string, unknown>
    try {
      // Extract JSON from response (handles cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in AI response:', responseText)
        throw new Error('No JSON found in AI response')
      }
      
      rawAnalysis = JSON.parse(jsonMatch[0])
    } catch {
      console.error('Failed to parse OpenAI response:', responseText)
      throw new Error('Invalid response format from AI')
    }

    // Validate the response structure with Zod
    let analysis: CompetitorAnalysis
    try {
      analysis = analysisSchema.parse(rawAnalysis)
    } catch (validationError) {
      console.error('Schema validation failed:', validationError)
      
      // Return detailed Zod errors for better debugging
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            success: false, 
            error: "AI response validation failed", 
            details: validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          },
          { status: 500 }
        )
      }
      
      throw validationError
    }

    // Teaser response only (do not return competitor details to unauthenticated clients)
    // Normalize count/categories from validated analysis
    const teaser = {
      count: Math.min(Math.max(analysis.count, 3), 8),
      categories: analysis.categories.slice(0, 4),
    }
    const minCount = Math.max(3, teaser.count - 1)
    const maxCount = Math.min(8, teaser.count + 1)

    // Generate short-lived analysisId (not persisted yet)
    const analysisId = crypto
      .createHash('sha256')
      .update(`${idea.trim()}|${Date.now()}`)
      .digest('hex')
      .slice(0, 16)

    // Basic logging (avoid logging full idea text)
    const logIp = clientIp
    console.info('[analyze-competitors:teaser]', { analysisId, ip: logIp, ts: Date.now() })

    return NextResponse.json({
      success: true,
      data: {
        analysisId,
        count: teaser.count,
        minCount,
        maxCount,
        categories: teaser.categories,
        blurred: true,
      },
      disclaimer: 'Competitor names and details are AI-generated and may not reflect real businesses.'
    })

  } catch (error) {
    console.error('Competitor analysis error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to analyze competitors' },
      { status: 500 }
    )
  }
}
