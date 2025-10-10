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
    console.log('=== /api/refine-idea called ===')
    
    // Step 1: Validate request
    console.log('Step 1: Parsing request body...')
    const body = await request.json()
    console.log('Request body:', body)
    
    console.log('Step 1.5: Validating input...')
    const { idea } = requestSchema.parse(body)
    console.log('Validated idea:', idea)

    // Step 1.5: Lightweight precheck for obviously insufficient inputs
    if (idea.trim().split(' ').length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Please describe your idea in a bit more detail (a few words is enough).'
      }, { status: 400 })
    }

    // Step 2: Validate whether the idea is business-relevant
    console.log('Step 2: Validating business relevance...')
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
    console.log('Step 3: Calling OpenAI API...')
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

    // Combined AI call: Insights + Risk Analysis
    const combinedPrompt = `
You are a senior business analyst with 15+ years of experience evaluating startups. Analyze this business concept comprehensively:

Problem: ${validatedResponse.problem}
Audience: ${validatedResponse.audience}
Solution: ${validatedResponse.solution}
Monetization: ${validatedResponse.monetization}

Provide a complete business analysis including:

1. AI INSIGHTS:
   - ai_verdict: One compelling sentence highlighting the core business opportunity
   - tier: "weak | average | good | exceptional" based on market size, competitive landscape, execution difficulty, and monetization potential
   - strengths: 3 specific competitive advantages, market opportunities, or unique value propositions
   - challenges: 3 specific market risks, execution difficulties, or competitive threats
   - recommendation: 3 specific, actionable next steps tailored to this exact business concept

2. RISK ANALYSIS:
   You are a senior risk analyst with 15+ years evaluating startup risks.
   
   SCORING GUIDELINES:
   Use the FULL 0-10 scale. Distribute scores honestly:
   - 0-3 = Low Risk (proven model, low competition, easy execution)
   - 4-6 = Medium Risk (some challenges, moderate competition)
   - 7-10 = High Risk (unproven, high competition, hard to execute)
   
   REFERENCE POINTS:
   - Simple SaaS tool (clear demand, low competition) = 3-4
   - AI tool in crowded market = 6-7
   - Hardware product requiring manufacturing = 8-9
   - Regulated industry (healthcare, finance) = 8-10
   
   BE DECISIVE: Most ideas are NOT exactly 6.5. 
   - If competition is fierce → score 8+
   - If it's easy to build and monetize → score 4 or less
   - If timing is off or market unproven → score 7+
   
   Calculate each category independently:
   1. business_viability (0-10): Can this make money?
   2. market_timing (0-10): Is now the right time?
   3. competition_level (0-10): How hard to compete? (higher = more competition)
   4. execution_difficulty (0-10): How hard to build/scale?
   
   Then calculate overall_score as WEIGHTED AVERAGE:
   - competition_level × 0.35 (most important)
   - business_viability × 0.25
   - market_timing × 0.20
   - execution_difficulty × 0.20
   
   - risk_level: "Low" (0-3.9), "Medium" (4-6.9), or "High" (7-10)
   - top_risks: 3 critical risks with title, severity, likelihood, description, mitigation

3. COMPETITOR ANALYSIS:
   - count: Number of similar competitors found (realistic estimate, 3-8)
   - categories: Array of 2-4 specific industry categories this idea fits into (be specific, not generic)

Return this EXACT JSON structure:
{
  "ai_insights": {
    "ai_verdict": "One compelling sentence highlighting the core business opportunity",
    "tier": "weak | average | good | exceptional",
    "strengths": ["Specific competitive advantage 1", "Specific market opportunity 2", "Specific unique value 3"],
    "challenges": ["Specific market risk 1", "Specific execution challenge 2", "Specific competitive threat 3"],
    "recommendation": "Step 1: [specific first action for this exact business]. Step 2: [specific second action]. Step 3: [specific third action]. Make each step concrete and tailored to this specific business concept."
  },
  "risk_analysis": {
    "overall_score": 6.5,
    "category_scores": {
      "business_viability": 7.0,
      "market_timing": 6.5,
      "competition_level": 7.5,
      "execution_difficulty": 6.0
    },
    "risk_level": "Medium",
    "top_risks": [
      {
        "title": "High market competition from established players",
        "severity": "High",
        "likelihood": "High",
        "description": "The market already has 10+ established competitors with strong brand recognition and customer loyalty. New entrants face significant challenges in customer acquisition.",
        "mitigation": "Focus on a specific underserved niche segment. Build 10x better UX in one area. Leverage modern AI capabilities that incumbents lack due to legacy systems."
      },
      {
        "title": "User adoption and education barriers",
        "severity": "Medium",
        "likelihood": "High",
        "description": "Target audience may be resistant to new technology or require significant education. Low tech literacy could slow adoption rates.",
        "mitigation": "Start with tech-savvy early adopters. Provide white-glove onboarding and training. Build in-app guides and video tutorials. Partner with trusted organizations for credibility."
      },
      {
        "title": "Revenue model validation uncertainty",
        "severity": "High",
        "likelihood": "Medium",
        "description": "Unclear whether customers will pay the proposed price point. Unit economics unproven. Risk of building product users won't pay for.",
        "mitigation": "Validate willingness to pay early with customer interviews. Offer tiered pricing to test price sensitivity. Run paid pilot with first 10 customers before building full product."
      }
    ]
  },
  "competitor_analysis": {
    "count": 5,
    "categories": ["Agricultural Technology", "Farm Management Software", "Precision Agriculture"]
  }
}

For competitor analysis: Research the actual competitive landscape and provide specific industry categories that this business would compete in. Avoid generic categories like "SaaS" or "Technology" - be specific to the industry and use case.

Base scores on realistic startup failure patterns. Be honest about risks - this builds trust.
`

    const combinedResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: combinedPrompt }],
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    })

    const analysis = JSON.parse(combinedResponse.choices[0]?.message?.content || '{}')

    // Extract insights, risk analysis, and competitor analysis with same structure as before
    const insights = analysis.ai_insights || {}
    const riskAnalysis = analysis.risk_analysis || {}
    const competitorAnalysis = analysis.competitor_analysis || {}

    // Validate and set defaults if AI response is incomplete
    const safeRiskAnalysis = {
      overall_score: riskAnalysis.overall_score || 5.0,
      category_scores: {
        business_viability: riskAnalysis.category_scores?.business_viability || 5.0,
        market_timing: riskAnalysis.category_scores?.market_timing || 5.0,
        competition_level: riskAnalysis.category_scores?.competition_level || 5.0,
        execution_difficulty: riskAnalysis.category_scores?.execution_difficulty || 5.0,
      },
      risk_level: riskAnalysis.risk_level || 'Medium',
      top_risks: riskAnalysis.top_risks || [],
    }

    // Enhanced business analysis scoring algorithm
    const score = (() => {
      const fields = [
        validatedResponse.problem,
        validatedResponse.audience,
        validatedResponse.solution,
        validatedResponse.monetization
      ]
      const textLengths = fields.map(f => f.length)
      const avgLength = textLengths.reduce((a, b) => a + b, 0) / fields.length

      const clarity = Math.min(1, avgLength / 180) // was 120 → now stricter
      const completeness = fields.filter(f => f.trim().length > 60).length / 4 // require richer text
      const balance = 1 - Math.min(1, Math.abs(textLengths[0] - textLengths[2]) / 300)

      // Weighted baseline with stronger penalty for short or uneven text
      const weights = { problem: 0.35, audience: 0.25, solution: 0.25, monetization: 0.15 }
      const weightedSum = fields.reduce(
        (acc, f, i) => acc + (f.length / 200) * Object.values(weights)[i],
        0
      )

      // Raw score before smoothing
      const rawScore = (clarity * 0.4 + completeness * 0.3 + balance * 0.2 + weightedSum * 0.1) * 100

      // Gaussian-like normalization — more realistic spread
      const normalized = 45 + (rawScore - 50) * 0.8 + (Math.random() - 0.5) * 10

      return Math.round(Math.min(95, Math.max(30, normalized)))
    })()

    // Step 4: Insert into Supabase with retry logic
    const record = await retryWithBackoff(async () => {
      // Extract guest session ID from request headers
      const guestSessionId = request.headers.get('x-guest-session-id') || 
                            request.headers.get('x-session-id') || 
                            'anonymous-' + Date.now()
      
      console.log('Attempting to insert into guest_ideas table with session:', guestSessionId)
      
      const { data, error: dbError } = await supabase
        .from('guest_ideas')
        .insert({
          guest_session_id: guestSessionId,
          idea_text: idea,
          problem: validatedResponse.problem,
          audience: validatedResponse.audience,
          solution: validatedResponse.solution,
          monetization: validatedResponse.monetization,
          ai_insights: insights,
          score,
          risk_score: safeRiskAnalysis.overall_score,
          risk_analysis: safeRiskAnalysis,
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Database error: ${dbError.message}`)
      }

      console.log('Successfully inserted into guest_ideas:', data)
      return data
    })

    // Step 5: Return success response with competitor analysis
    return NextResponse.json({
      success: true,
      idea: {
        ...record,
        competitor_analysis: competitorAnalysis,
      },
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
