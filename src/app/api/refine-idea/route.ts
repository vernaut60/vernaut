import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

const anthropicApiKey = process.env.ANTHROPIC_API_KEY

if (!anthropicApiKey) {
  throw new Error('Missing environment variable: ANTHROPIC_API_KEY')
}

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
})

// Calculate weighted risk score with our weights
function calculateRiskScore(categoryScores: {
  competition_level: number
  business_viability: number
  market_timing: number
  execution_difficulty: number
}) {
  const weights = {
    competition_level: 0.35,      // Competition matters most
    business_viability: 0.25,     // Can it make money?
    market_timing: 0.20,          // Is now the right time?
    execution_difficulty: 0.20    // Can it be built?
  }
  
  const weightedScore = 
    categoryScores.competition_level * weights.competition_level +
    categoryScores.business_viability * weights.business_viability +
    categoryScores.market_timing * weights.market_timing +
    categoryScores.execution_difficulty * weights.execution_difficulty
  
  // Round to 1 decimal
  return Math.round(weightedScore * 10) / 10
}

// Generate clean, professional title from idea text using AI
async function generateTitle(ideaText: string): Promise<string> {
  try {
    const titlePrompt = `You are a professional copywriter specializing in startup and business titles.

Your task: Create a clean, professional title (2-6 words) for this business idea.

RULES:
- Keep it 2-6 words maximum
- Use title case (Capitalize Important Words)
- Be specific and descriptive
- Avoid generic words like "platform", "app", "tool" unless necessary
- Focus on the core value proposition
- Make it sound professional and compelling

EXAMPLES:
Input: "AI platform for farmers to optimize yields" → "AI for Sustainable Farming"
Input: "Invoicing software for freelance designers" → "Invoicing for Freelancers"  
Input: "Dating app for book lovers" → "Dating for Book Lovers"
Input: "Project management tool for remote teams" → "Remote Team Project Manager"

Your idea: "${ideaText}"

Generate a professional title:`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: titlePrompt }],
        max_tokens: 20,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedTitle = data.choices[0].message.content.trim()
    
    // Clean up the response (remove quotes, extra spaces)
    const cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim()
    
    // Fallback to simple truncation if AI fails
    if (!cleanTitle || cleanTitle.length > 50) {
      return fallbackTitle(ideaText)
    }
    
    return cleanTitle
    
  } catch (error) {
    console.warn('AI title generation failed, using fallback:', error)
    return fallbackTitle(ideaText)
  }
}

// Fallback title generation (simple but better than before)
function fallbackTitle(ideaText: string): string {
  const cleanText = ideaText.trim().replace(/\s+/g, ' ')
  
  // Extract key words and create a simple title
  const words = cleanText.split(' ')
  const keyWords = words.filter(word => 
    word.length > 3 && 
    !['for', 'the', 'and', 'with', 'that', 'this', 'platform', 'app', 'tool', 'software'].includes(word.toLowerCase())
  )
  
  if (keyWords.length >= 2) {
    return `${keyWords[0]} ${keyWords[1]}`.replace(/[^\w\s]/g, '')
  }
  
  // Last resort: first few words
  if (words.length > 1) {
    return words.slice(0, 2).join(' ')
  }
  
  return cleanText.substring(0, 30)
}

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

    const validationResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5,
      temperature: 0,
      messages: [{ role: 'user', content: validationPrompt }]
    })

    const verdict = validationResponse.content[0]?.type === 'text' ? validationResponse.content[0].text?.trim().toLowerCase() : ''

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

    // Step 3: Call Anthropic with retry logic
    console.log('Step 3: Calling Anthropic API...')
    const validatedResponse = await retryWithBackoff(async () => {
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `You are a senior business consultant specializing in startups.

Return ONLY a valid JSON object with exactly these 4 fields:
{ "problem": "...", "audience": "...", "solution": "...", "monetization": "..." }

Rules:
- Ensure ideas are legal, ethical, and socially responsible.
- If idea is vague, rewrite it into a clearer form before analysis.
- Keep responses concise but meaningful (2–3 sentences per field).
- Return ONLY the JSON object, no markdown formatting, no explanations.

Analyze this idea: "${idea}"`
          }
        ]
      })

      const aiResponse = completion.content[0]?.type === 'text' ? completion.content[0].text : ''

      if (!aiResponse) {
        throw new Error('No response from AI')
      }

      // Step 3: Clean and parse JSON response
      let cleanResponse = aiResponse
      
      // Remove markdown code blocks if present
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '')
      }
      if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Try to extract JSON from the response if it's malformed
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanResponse = jsonMatch[0]
      }
      
      let parsedResponse: any
      try {
        parsedResponse = JSON.parse(cleanResponse)
      } catch (error) {
        console.error('Failed to parse AI response:', cleanResponse)
        console.error('Parse error:', error)
        throw new Error('Invalid JSON response from AI')
      }
      
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

// 1. AI INSIGHTS: (COMMENTED OUT FOR DEMO)
//    - ai_verdict: One compelling sentence highlighting the core business opportunity
//    - tier: "weak | average | good | exceptional" based on market size, competitive landscape, execution difficulty, and monetization potential
//    - strengths: 3 specific competitive advantages, market opportunities, or unique value propositions
//    - challenges: 3 specific market risks, execution difficulties, or competitive threats
//    
//    CHALLENGES FOCUS - Do NOT name specific competitors:
//    Focus on market dynamics, customer behavior, execution complexity, and business model challenges.
//    Instead of naming competitors, describe WHY it's hard (market dynamics, switching costs, etc.)
//    Each challenge should be 40-60 words and specific to business dynamics.
//    - recommendation: 3 specific, actionable next steps tailored to this exact business concept

2. RISK ANALYSIS:
   You are a senior risk analyst evaluating startup ideas across ALL business models.
   
   Rate each risk category 0-10. Use FULL scale, be decisive.
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   1. MARKET TIMING (0=perfect timing, 10=terrible timing)
   
   0-2: Market ready NOW, strong proven demand
        • Remote work tools (2020), AI tools (2024)
        • Sustainable products (2023+)
        
   3-5: Growing market, some education needed
        • No-code tools, Creator economy
        • DTC brands in trending categories
        
   6-8: Early/late, market needs work or declining
        • VR apps (too early), Meal kits (past peak)
        • Crypto projects (2023-2024)
        
   9-10: Terrible timing, market doesn't exist
         • Metaverse pivots (2023), DVD rental
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   2. COMPETITION (0=blue ocean, 10=dominated by giants)
   
   0-2: Almost no competition, true blue ocean
        • Ultra-niche vertical SaaS
        • First mover in emerging category
        
   3-5: Few competitors, room for differentiation
        • Industry-specific software
        • Regional service businesses
        
   6-8: Crowded, many established players
        • Project management tools
        • E-commerce in popular categories
        • Local service businesses
        
   9-10: Dominated by tech giants or unicorns
         • Social networks, Search, Cloud storage
         • Dating apps, Food delivery
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   3. BUSINESS VIABILITY (0=proven model, 10=hard to monetize)
   
   0-2: Proven business model, clear profitability
        • B2B SaaS subscriptions
        • Service businesses with direct payment
        • Marketplace with commissions
        
   3-5: Viable but uncertain unit economics
        • Freemium SaaS, DTC e-commerce
        • Usage-based pricing, Ad-supported content
        
   6-8: Difficult monetization, long payback
        • Consumer apps (network effects needed)
        • Hardware (high upfront costs)
        • Media/Content (ad revenue uncertain)
        
   9-10: Extremely hard to monetize
         • Free consumer utilities
         • Charity/non-profit platforms
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   4. EXECUTION DIFFICULTY (0=easy, 10=nearly impossible)
   
   0-2: Simple to launch, solo-founder viable
        • Newsletter, Content site
        • Simple booking/scheduling tools
        • Service business (consulting, design)
        
   3-5: Moderate complexity, small team, 3-6mo
        • Standard SaaS tools, CRM
        • E-commerce store, DTC brand
        • Mobile app with simple features
        
   6-8: Complex, specialized skills, 6-12mo
        • AI/ML platforms, Real-time collaboration
        • Marketplace (two-sided)
        • Consumer app with network effects
        
   9-10: Extremely complex, multi-year
         • Hardware/IoT, Autonomous vehicles
         • Biotech, Medical devices
         • Blockchain infrastructure
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   BUSINESS TYPE EXAMPLES FOR CALIBRATION:
   
   Software/SaaS: Competition 6-8, Execution 4-6, Viability 2-4
   Hardware/IoT: Competition 5-7, Execution 8-10, Viability 6-8
   Marketplace: Competition 7-9, Execution 6-8, Viability 5-7
   E-commerce/DTC: Competition 7-9, Execution 4-6, Viability 5-7
   Content/Media: Competition 6-8, Execution 2-4, Viability 6-8
   Service Business: Competition 5-7, Execution 2-4, Viability 3-5
   Biotech/Medical: Competition 4-6, Execution 9-10, Viability 8-9
   Consumer App: Competition 8-10, Execution 5-7, Viability 7-9
   
   CRITICAL RULES:
   1. Use FULL 0-10 range based on business type
   2. At least ONE score should be below 5 or above 7
   3. Avoid all scores in 6-7 (not useful)
   4. Different business models have different risk profiles
   5. Be decisive - use extremes when warranted
   
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
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   5. BRIEF EXPLANATIONS (For Demo Display)
   
   For EACH of the 4 risk categories, generate a brief explanation:
   - Length: 20-30 words
   - Explains WHY this score was given
   - Focuses on business dynamics, not just stating the obvious
   - Concrete and specific to THIS business
   
   Examples:
   
   Market Timing: 3/10
   ❌ Bad: "Good timing for this market"
   ✅ Good: "Climate volatility and government sustainability mandates 
            are creating regulatory push for precision agriculture 
            adoption across developed markets."
   
   Competition: 7/10  
   ❌ Bad: "High competition in this space"
   ✅ Good: "Well-funded incumbents control 60%+ market share with 
            established distribution through equipment dealers and 
            multi-year enterprise contracts."
   
   Business Viability: 5/10
   ❌ Bad: "Monetization is moderately viable"
   ✅ Good: "Hardware deployment creates capital requirements, but 
            measurable ROI (20-30% resource savings) justifies 
            $99-199/mo subscription pricing."
   
   Execution: 8.5/10
   ❌ Bad: "Very difficult to execute"
   ✅ Good: "Requires simultaneous expertise across hardware engineering, 
            satellite data processing, agronomic science, and AI/ML 
            while managing physical sensor supply chain."
   
   CRITICAL RULES for explanations:
   1. NO competitor names (save for separate Competitor Landscape)
   2. Focus on DYNAMICS not just restating the score
   3. Include specific metrics when possible (%, market share, costs)
   4. Explain WHY it's hard/easy, not just that it is
   5. 20-30 words max (must be scannable)
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. COMPETITOR ANALYSIS:
   - count: Number of similar competitors found (realistic estimate, 3-8)
   - categories: Array of 2-4 specific industry categories this idea fits into (be specific, not generic)

Return this EXACT JSON structure:
{
  // "ai_insights": { (COMMENTED OUT FOR DEMO)
  //   "ai_verdict": "One compelling sentence highlighting the core business opportunity",
  //   "tier": "weak | average | good | exceptional",
  //   "strengths": ["Specific competitive advantage 1", "Specific market opportunity 2", "Specific unique value 3"],
  //   "challenges": ["Specific market risk 1", "Specific execution challenge 2", "Specific competitive threat 3"],
  //   "recommendation": "Step 1: [specific first action for this exact business]. Step 2: [specific second action]. Step 3: [specific third action]. Make each step concrete and tailored to this specific business concept."
  // },
  "risk_analysis": {
    "overall_score": 6.5,
    "category_scores": {
      "business_viability": 7.0,
      "market_timing": 6.5,
      "competition_level": 7.5,
      "execution_difficulty": 6.0
    },
    "explanations": {
      "business_viability": "Hardware deployment creates capital requirements, but measurable ROI (20-30% resource savings) justifies $99-199/mo subscription pricing.",
      "market_timing": "Climate volatility and government sustainability mandates are creating regulatory push for precision agriculture adoption across developed markets.",
      "competition_level": "Well-funded incumbents control 60%+ market share with established distribution through equipment dealers and multi-year enterprise contracts.",
      "execution_difficulty": "Requires simultaneous expertise across hardware engineering, satellite data processing, agronomic science, and AI/ML while managing physical sensor supply chain."
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

Return ONLY a valid JSON object with the exact structure shown above. Do not use markdown formatting, code blocks, or any other text outside the JSON object.
`

    // Idea Strength scoring (V1 fallback or V2 feature-flagged)
    const useStrengthV2 = process.env.IDEA_STRENGTH_V2 === 'true'
    
    // Create subscores prompt if needed
    const subscoresPrompt = useStrengthV2 ? `
Return ONLY a valid JSON object with this exact structure (no markdown, no prose):
{
  "differentiation": { "score": number, "rationale": string },
  "market_pull": { "score": number, "rationale": string },
  "monetization_viability": { "score": number, "rationale": string },
  "feasibility_lite": { "score": number, "rationale": string }
}

Rules:
- Each score MUST be between 0 and 10 and use the full scale when warranted.
- Be decisive; avoid clustering all scores in 6–7.
- JSON only; no code blocks.

Idea context:
Problem: ${validatedResponse.problem}
Audience: ${validatedResponse.audience}
Solution: ${validatedResponse.solution}
Monetization: ${validatedResponse.monetization}
` : ''
    
    // PARALLEL PROCESSING: Run both AI calls simultaneously
    console.log('🚀 Starting parallel AI processing...')
    const startTime = Date.now()
    
    const [combinedResponse, subscoresResp] = await Promise.all([
      // Combined analysis call
      anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        temperature: 0.5,
        messages: [{ role: 'user', content: combinedPrompt }]
      }),
      // Subscores call (only if useStrengthV2)
      useStrengthV2 ? anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 600,
        temperature: 0.2,
        messages: [{ role: 'user', content: subscoresPrompt }]
      }) : Promise.resolve({ content: [{ type: 'text', text: '{}' }] })
    ])
    
    const parallelTime = Date.now() - startTime
    console.log(`⚡ Parallel AI calls completed in ${parallelTime}ms`)

    // Clean and parse the combined response
    let combinedText = combinedResponse.content[0]?.type === 'text' ? combinedResponse.content[0].text || '{}' : '{}'
    
    // Remove markdown code blocks if present
    if (combinedText.includes('```json')) {
      combinedText = combinedText.replace(/```json\s*/, '').replace(/\s*```$/, '')
    }
    if (combinedText.includes('```')) {
      combinedText = combinedText.replace(/```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Try to extract JSON from the response if it's malformed
    const jsonMatch = combinedText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      combinedText = jsonMatch[0]
    }
    
    let analysis: any
    try {
      analysis = JSON.parse(combinedText)
    } catch (error) {
      console.error('Failed to parse combined response:', combinedText)
      console.error('Parse error:', error)
      
      // Fallback: create a basic analysis structure
      analysis = {
        // ai_insights: { (COMMENTED OUT FOR DEMO)
        //   ai_verdict: "Analysis temporarily unavailable",
        //   tier: "average",
        //   strengths: ["Analysis in progress"],
        //   challenges: ["Processing error"],
        //   recommendation: ["Please try again"]
        // },
        risk_analysis: {
          overall_score: 5.0,
          risk_level: "Medium",
          category_scores: {
            competition_level: 5.0,
            business_viability: 5.0,
            market_timing: 5.0,
            execution_difficulty: 5.0
          }
        },
        competitor_analysis: {
          count: 0,
          categories: [],
          competitors: []
        }
      }
    }

    // Extract insights, risk analysis, and competitor analysis with same structure as before
    // const insights = analysis.ai_insights || {} // COMMENTED OUT FOR DEMO
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
      explanations: riskAnalysis.explanations || {
        business_viability: "Analysis pending - please try again",
        market_timing: "Analysis pending - please try again", 
        competition_level: "Analysis pending - please try again",
        execution_difficulty: "Analysis pending - please try again"
      },
      risk_level: riskAnalysis.risk_level || 'Medium',
      top_risks: riskAnalysis.top_risks || [],
    }

    // Quality control for risk assessment scoring
    if (safeRiskAnalysis.overall_score >= 6.0 && safeRiskAnalysis.overall_score <= 7.0) {
      console.warn('⚠️ Score in the generic 6-7 range. Check if AI is being too safe.');
    }

    // Calculate spread to detect low variance
    const scores = Object.values(safeRiskAnalysis.category_scores);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const spread = max - min;

    if (spread < 2.0) {
      console.warn('⚠️ Low score variance. Categories too similar.');
    }

    // Calculate our own weighted score and override AI's overall_score
    const calculatedOverallScore = calculateRiskScore(safeRiskAnalysis.category_scores)
    
    // Update the risk analysis with our calculated score
    safeRiskAnalysis.overall_score = calculatedOverallScore
    
    // Update risk level based on calculated score
    if (calculatedOverallScore <= 3.9) {
      safeRiskAnalysis.risk_level = 'Low'
    } else if (calculatedOverallScore <= 6.9) {
      safeRiskAnalysis.risk_level = 'Medium'
    } else {
      safeRiskAnalysis.risk_level = 'High'
    }

    let score: number

    if (useStrengthV2) {
      try {
        // subscoresResp is now handled in parallel processing above

        let subscoresText = subscoresResp.content[0]?.type === 'text' ? subscoresResp.content[0].text || '{}' : '{}'
        if (subscoresText.includes('```json')) subscoresText = subscoresText.replace(/```json\s*/, '').replace(/\s*```$/, '')
        if (subscoresText.includes('```')) subscoresText = subscoresText.replace(/```\s*/, '').replace(/\s*```$/, '')
        const subscoresMatch = subscoresText.match(/\{[\s\S]*\}/)
        if (subscoresMatch) subscoresText = subscoresMatch[0]

        const subs = JSON.parse(subscoresText) as {
          differentiation?: { score?: number }
          market_pull?: { score?: number }
          monetization_viability?: { score?: number }
          feasibility_lite?: { score?: number }
        }

        // Clean, simpler algorithm
        const calculateStdDev = (arr: number[]) => {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length
          return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length)
        }

        const calculateDemoScore = (subscores: any, riskScore: number) => {
          // Get subscores with better defaults
          const d = subscores.differentiation?.score ?? 6
          const m = subscores.market_pull?.score ?? 6
          const mv = subscores.monetization_viability?.score ?? 6
          const f = subscores.feasibility_lite?.score ?? 6
          
          // Variance floor
          let scores = [d, m, mv, f]
          const stdev = calculateStdDev(scores)
          
          if (stdev < 1.5) {
            const max = Math.max(...scores)
            const min = Math.min(...scores)
            const maxIdx = scores.indexOf(max)
            const minIdx = scores.indexOf(min)
            scores[maxIdx] = Math.min(10, scores[maxIdx] + 0.5)
            scores[minIdx] = Math.max(0, scores[minIdx] - 0.5)
          }
          
          const [d2, m2, mv2, f2] = scores
          
          // Weighted average
          const weighted = d2 * 0.4 + m2 * 0.3 + mv2 * 0.2 + f2 * 0.1
          
          // Convert to 0-100 with base boost
          let score = (weighted * 10) + 10  // +10 points base
          
          // Light risk penalty
          const riskPenalty = (riskScore / 10) * 8  // Max -8 points
          score = score - riskPenalty
          
          // Differentiation bonus
          if (d2 >= 6.5) score += 3
          
          // High risk cap (very lenient)
          if (riskScore >= 8 && d2 < 7) {
            score = Math.min(score, 68)
          }
          
          // Noise
          const noise = (Math.random() * 4) - 2
          score += noise
          
          // Clamp
          const DEMO_FLOOR = 60
          const DEMO_CEILING = 88
          score = Math.round(Math.max(DEMO_FLOOR, Math.min(DEMO_CEILING, score)))
          
          return score
        }

        const r = Number(safeRiskAnalysis.overall_score ?? 5)
        score = calculateDemoScore(subs, r)
      } catch (e) {
        console.warn('Idea Strength V2 failed, falling back to V1:', e)
        // Fallback to existing heuristic (V1)
        const fields = [
          validatedResponse.problem,
          validatedResponse.audience,
          validatedResponse.solution,
          validatedResponse.monetization
        ]
        const textLengths = fields.map(f => f.length)
        const avgLength = textLengths.reduce((a, b) => a + b, 0) / fields.length
        const clarity = Math.min(1, avgLength / 180)
        const completeness = fields.filter(f => f.trim().length > 60).length / 4
        const balance = 1 - Math.min(1, Math.abs(textLengths[0] - textLengths[2]) / 300)
        const weights = { problem: 0.35, audience: 0.25, solution: 0.25, monetization: 0.15 }
        const weightedSum = fields.reduce((acc, f, i) => acc + (f.length / 200) * Object.values(weights)[i], 0)
        const rawScore = (clarity * 0.4 + completeness * 0.3 + balance * 0.2 + weightedSum * 0.1) * 100
        const normalized = 45 + (rawScore - 50) * 0.8 + (Math.random() - 0.5) * 10
        score = Math.round(Math.min(95, Math.max(30, normalized)))
      }
    } else {
      // Existing heuristic (V1)
      const fields = [
        validatedResponse.problem,
        validatedResponse.audience,
        validatedResponse.solution,
        validatedResponse.monetization
      ]
      const textLengths = fields.map(f => f.length)
      const avgLength = textLengths.reduce((a, b) => a + b, 0) / fields.length
      const clarity = Math.min(1, avgLength / 180)
      const completeness = fields.filter(f => f.trim().length > 60).length / 4
      const balance = 1 - Math.min(1, Math.abs(textLengths[0] - textLengths[2]) / 300)
      const weights = { problem: 0.35, audience: 0.25, solution: 0.25, monetization: 0.15 }
      const weightedSum = fields.reduce((acc, f, i) => acc + (f.length / 200) * Object.values(weights)[i], 0)
      const rawScore = (clarity * 0.4 + completeness * 0.3 + balance * 0.2 + weightedSum * 0.1) * 100
      const normalized = 45 + (rawScore - 50) * 0.8 + (Math.random() - 0.5) * 10
      score = Math.round(Math.min(95, Math.max(30, normalized)))
    }

    // Step 4: Insert into Supabase with retry logic
    const record = await retryWithBackoff(async () => {
      // Extract guest session ID from request headers
      const guestSessionId = request.headers.get('x-guest-session-id') || 
                            request.headers.get('x-session-id') || 
                            'anonymous-' + Date.now()
      
      console.log('Attempting to insert into guest_ideas table with session:', guestSessionId)
      
      // Generate professional title using AI
      const title = await generateTitle(idea)
      console.log('Generated title:', title)
      
      const { data, error: dbError } = await supabase
        .from('guest_ideas')
        .insert({
          guest_session_id: guestSessionId,
          idea_text: idea,
          title: title,
          problem: validatedResponse.problem,
          audience: validatedResponse.audience,
          solution: validatedResponse.solution,
          monetization: validatedResponse.monetization,
          // ai_insights: insights, // COMMENTED OUT FOR DEMO
          score,
          risk_score: safeRiskAnalysis.overall_score,
          risk_analysis: safeRiskAnalysis,
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        
        // Handle duplicate key constraint violation
        if (dbError.code === '23505') {
          console.log('🔄 Duplicate idea detected, updating existing record with fresh analysis...')
          
          // Update the existing record with fresh AI analysis instead of inserting new one
          const updateResult = await supabase
            .from('guest_ideas')
            .update({
              title: title,
              problem: validatedResponse.problem,
              audience: validatedResponse.audience,
              solution: validatedResponse.solution,
              monetization: validatedResponse.monetization,
              // ai_insights: insights, // COMMENTED OUT FOR DEMO
              score,
              risk_score: safeRiskAnalysis.overall_score,
              risk_analysis: safeRiskAnalysis,
              updated_at: new Date().toISOString()
            })
            .eq('guest_session_id', guestSessionId)
            .eq('idea_text', idea)
            .select()
            .single()
          
          if (updateResult.data) {
            console.log('✅ Updated existing record with fresh analysis:', updateResult.data)
            return updateResult.data
          }
        }
        
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

    // Handle Claude API specific errors
    if (errorMessage.includes('rate_limit_exceeded') || errorMessage.includes('quota_exceeded')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is experiencing high demand. Please try again in a few minutes.'
        },
        { status: 429 }
      )
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('request_timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is taking longer than expected. Please try again.'
        },
        { status: 504 }
      )
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('api_key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service configuration error. Please contact support.'
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('No response from AI') || errorMessage.includes('anthropic')) {
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
