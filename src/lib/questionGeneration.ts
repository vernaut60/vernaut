import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Lazy getters - only check when actually needed (not at module load)
function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error('Missing environment variable: ANTHROPIC_API_KEY')
  }
  return key
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
  }
  return key
}

// Question types that frontend can render
type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'number'

interface Question {
  id: string
  type: QuestionType
  text: string
  required: boolean
  placeholder?: string
  help_text?: string
  options?: string[]  // For radio/checkbox/select
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: string
  }
}

// Retry utility with exponential backoff
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
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Determine complexity level of the idea
function analyzeIdeaComplexity(ideaText: string): 'simple' | 'medium' | 'complex' {
  const length = ideaText.length
  const complexKeywords = /AI|ML|machine learning|blockchain|healthcare|fintech|enterprise|B2B|SaaS|platform|marketplace|API|infrastructure|cloud|data|analytics/i
  const regulatoryKeywords = /HIPAA|GDPR|FDA|regulated|compliance|financial|medical|legal/i
  
  const hasComplexTech = complexKeywords.test(ideaText)
  const hasRegulatory = regulatoryKeywords.test(ideaText)
  
  if ((hasComplexTech && hasRegulatory) || (length > 200 && hasComplexTech)) {
    return 'complex' // 10-12 questions
  } else if (hasComplexTech || length > 100) {
    return 'medium' // 7-9 questions
  } else {
    return 'simple' // 5-6 questions
  }
}

// Generate questions using Claude
async function generateQuestionsWithAI(ideaText: string): Promise<Question[]> {
  const anthropicApiKey = getAnthropicApiKey()
  const anthropic = new Anthropic({ apiKey: anthropicApiKey })
  
  const complexity = analyzeIdeaComplexity(ideaText)
  const questionCount = {
    'simple': '5-6',
    'medium': '7-9',
    'complex': '10-12'
  }[complexity]

  const prompt = `You are an expert startup advisor. Analyze this idea and generate smart, targeted questions.

IDEA: "${ideaText.trim()}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: AVOID REDUNDANT QUESTIONS ⚠️

Before generating questions, ANALYZE WHAT'S ALREADY IN THE IDEA TEXT:

**Check if the idea already mentions:**
- ✅ Geographic location/market (e.g., "in California", "US market", "India", "for Indiana families")
- ✅ Target customer (e.g., "for small businesses", "targeting farmers", "B2B SaaS")
- ✅ Solution/product type (e.g., "mobile app", "SaaS platform", "consulting service")
- ✅ Business model (e.g., "subscription", "marketplace", "freemium")
- ✅ Problem being solved (e.g., "farmers lack real-time weather data")
- ✅ Unique value prop (e.g., "AI-powered", "10x cheaper", "first in market")

**If information is ALREADY in the idea:**
- ❌ DON'T ask about it again
- ✅ Move on to what's MISSING

**Example 1:**
Idea: "Agrotourism farm in Indiana for families seeking farm experiences"
Already stated: Geographic market (Indiana), target customer (families), solution type (agrotourism)
DON'T ask: "Which geographic market?" ❌
DO ask: "What existing solutions do families use?" ✅

**Example 2:**
Idea: "AI-powered expense management SaaS for small businesses"
Already stated: Solution (SaaS), target (small businesses), differentiator (AI-powered)
DON'T ask: "What type of solution?" ❌
DO ask: "Which geographic market will you launch in first?" ✅

**Example 3:**
Idea: "Help people find better job opportunities"
Not stated: Geographic market, target customer segment, solution type, business model
DO ask: "Which geographic market?" ✅
DO ask: "What specific customer segment?" ✅
DO ask: "What type of solution?" ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYSIS STEP (think before generating):
1. What information is ALREADY PROVIDED in the idea text?
   - Write it down explicitly
   - Example: "Already stated: Indiana (location), families (customer), agrotourism (solution)"
   
2. What information is MISSING and truly needed?
   - Only these become questions
   - Example: "Missing: existing alternatives, budget, technical capability, timeline"
   
3. What type of business is this? (B2B/B2C, SaaS/marketplace/product/service)

4. What are the CRITICAL risk factors? (technical complexity, domain expertise, competition, etc.)

5. What information is MOST important to assess viability?
   - Focus questions here
   - Skip nice-to-have details

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULES - NEVER MAKE ASSUMPTIONS:

❌ NEVER assume:
1. Geographic market (don't say "in the US", "US market", etc.) IF NOT STATED IN IDEA
2. Specific competitors by name (Weather Underground, Uber, Stripe, etc.)
3. Specific regulations (FDA, GDPR, HIPAA, etc.)
4. Technology availability (don't assume cloud, apps, internet)
5. Business model (don't assume SaaS, subscription, etc.) IF NOT STATED IN IDEA
6. Currency or pricing levels (don't assume USD or specific ranges)
7. Market maturity (don't assume developed vs emerging markets)
8. Customer behavior (don't assume smartphone usage, credit cards, etc.)

✅ INSTEAD - ASK USER TO PROVIDE CONTEXT (only for what's MISSING):
1. IF location not in idea → "Which geographic market are you targeting?"
2. IF competitors not mentioned → "What existing solutions do customers use in your market?"
3. IF regulations not mentioned → "What regulations apply in your target market?"
4. IF tech not clear → "How do your target customers access technology?"
5. IF budget not mentioned → "What budget do you have available?"
6. IF business model not clear → "How do customers in your market prefer to pay?"

**Remember: Only ask about what's NOT already in the idea!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on your analysis, generate ${questionCount} questions that will help assess:
- Target market and geography (if not specified in idea)
- Problem and customer understanding
- Existing solutions in THEIR market (not assumptions)
- Solution approach and unique value
- Execution capability (technical skills, domain expertise, resources)
- Business model and monetization
- Team, commitment, and timeline

CRITICAL: Use the RIGHT input type for each question:

**text**: Short answers (1-2 sentences, names, titles)

**textarea**: Longer explanations (3+ sentences, detailed descriptions)
  - Use for: problem descriptions, target customer details, competitive analysis
  - Always set validation: { "minLength": 30, "maxLength": 400 }

**radio**: Single choice from clear options (mutually exclusive)
  - Use for: technical ability, commitment level, business model type
  - Provide 3-5 clear, distinct options

**checkbox**: Multiple selections allowed (can pick several)
  - Use for: team skills, regulatory considerations, channels
  - User can select multiple options

**select**: Single choice from long list (>5 options)
  - Use for: geographic markets, industries, customer segments
  - Good for: ["United States", "Europe", "Asia", "Africa", "Latin America", "Middle East", "Global", "Other"]

**number**: Numeric input (budget, team size, timeframe)
  - Always include validation: { "min": 0, "max": reasonable_limit }
  - Add helpful placeholder showing expected range
  - **CRITICAL for budget questions**: Use "startup_budget" (what founder has to launch), NOT "budget" (ambiguous)

QUESTION EXAMPLES (Context-Agnostic):

✅ GOOD - Generic and open:
"Which geographic market and customer segment are you targeting?"
"What existing solutions do your target customers currently use? What are their limitations?"
"What regulations or certifications are required to operate in your target market?"
"How do your target customers typically access services like this? (mobile apps, web, SMS, in-person, etc.)"
"What budget do you have available to start and launch this business? (startup_budget)"

❌ BAD - Makes assumptions:
"How will you compete in the US market with established players?"
"What makes your solution better than Weather Underground or Climate FieldView?"
"Can you meet FDA approval requirements?"
"What's your SaaS subscription pricing?"
"Will customers download your iOS/Android app?"


QUESTION DESIGN RULES:
1. Make questions SPECIFIC to this idea (not generic startup questions)
2. Order logically: Context → Problem → Customer → Solution → Business Model → Execution → Team
3. If idea is vague about geography, ALWAYS ask about target market first
4. Use conversational, friendly language
5. Add helpful placeholder text and help_text
6. For critical questions, set required: true
7. Use validation appropriately (minLength for important text answers)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: BUDGET QUESTIONS - CLEAR NAMING REQUIRED ⚠️

When asking about money/budget, you MUST distinguish between TWO different concepts:

1. **STARTUP BUDGET** (what the FOUNDER has to launch)
   ✅ Use ID: "startup_budget" or "available_budget" or "launch_budget"
   ❌ NEVER use: "budget", "customer_budget", "development_budget"
   
   Question text should adapt to business type:
   - SaaS/Software: "What budget do you have available to develop and launch this software?"
   - Physical Product: "What budget do you have available to manufacture and launch this product?"
   - Service Business: "What budget do you have available to start and launch this service?"
   - Physical Location: "What budget do you have available to set up and open this location?"
   - Generic (works for ALL): "What budget do you have available to start and launch this business?"
   
   Help text: "Your available funds - personal savings, commitments, or capital to launch"

2. **MARKET SPENDING** (what CUSTOMERS currently pay - optional market research)
   ✅ Use ID: "current_market_spending" or "market_spending_intel"
   ❌ NEVER use: "customer_budget" (too ambiguous!)
   
   Question: "How much do your target customers currently spend on similar [products/services/solutions]?"
   Help text: "Understanding what customers pay helps assess pricing opportunity (optional market research)"
   Make this: required: false

WHY THIS MATTERS:
- "startup_budget" = Used to assess if they can BUILD/LAUNCH (execution feasibility)
- "current_market_spending" = Used to understand CUSTOMER willingness to pay (market context)
- Confusing these causes AI to use wrong numbers in risk analysis!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDATION OBJECT ORDER (IMPORTANT):
Always order properties: minLength before maxLength, min before max
Example: { "minLength": 30, "maxLength": 400 }
Example: { "min": 0, "max": 10000000 }

IMPORTANT: Return ONLY valid JSON (no markdown, no code blocks, no explanation).

Example structure:

[
  {
    "id": "target_market",
    "type": "select",
    "text": "Which geographic market will you launch in first?",
    "required": true,
    "options": ["United States", "Canada", "Europe", "United Kingdom", "Asia-Pacific", "India", "China", "Southeast Asia", "Middle East", "Africa", "Latin America", "Global", "Other"],
    "help_text": "Start with one specific market - you can expand later."
  },
  {
    "id": "target_customer",
    "type": "textarea",
    "text": "Describe your target customer in that market as specifically as possible.",
    "required": true,
    "placeholder": "e.g., Small-scale rice farmers in Punjab with 2-10 acres, limited English literacy, access to basic mobile phones...",
    "help_text": "Be very specific - industry, size, location, behaviors, pain points.",
    "validation": {
      "minLength": 30,
      "maxLength": 400
    }
  },
  {
    "id": "existing_solutions",
    "type": "textarea",
    "text": "What solutions, tools, or methods do your target customers currently use to solve this problem? What are the limitations?",
    "required": true,
    "placeholder": "e.g., They currently rely on government radio broadcasts and local agricultural agents, but information is often delayed by 2-3 days...",
    "help_text": "Understanding current alternatives helps us assess your competitive advantage.",
    "validation": {
      "minLength": 30,
      "maxLength": 400
    }
  },
  {
    "id": "technical_capability",
    "type": "radio",
    "text": "What's your technical capability to build this solution?",
    "required": true,
    "options": [
      "Expert - I've built similar systems before",
      "Strong technical skills - can build this",
      "Some technical knowledge - will need help",
      "Limited - will hire developers",
      "None - seeking technical co-founder"
    ],
    "help_text": "Be honest - this affects feasibility assessment."
  },
  {
    "id": "startup_budget",
    "type": "number",
    "text": "What budget do you have available to start and launch this business? (in USD)",
    "required": true,
    "placeholder": "10000",
    "help_text": "Your available funds - personal savings, funding commitments, or capital you have to launch. Include costs for development, manufacturing, inventory, equipment, marketing, and initial operations.",
    "validation": {
      "min": 0,
      "max": 10000000
    }
  },
  {
    "id": "current_market_spending",
    "type": "textarea",
    "text": "How much do your target customers currently spend on similar solutions, products, or services in your market? (Optional - helps understand pricing opportunity)",
    "required": false,
    "placeholder": "e.g., Small businesses typically spend $500-2000 annually on business consultants and market research, or $50-100/month on SaaS tools for this purpose...",
    "help_text": "Market research about current customer spending - helps assess willingness to pay and competitive pricing.",
    "validation": {
      "minLength": 20,
      "maxLength": 400
    }
  },
  {
    "id": "regulatory_requirements",
    "type": "textarea",
    "text": "What regulatory approvals, licenses, or certifications (if any) are required to operate in your target market?",
    "required": false,
    "placeholder": "e.g., Agricultural advisory license from state government, data privacy compliance...",
    "help_text": "Leave blank if unsure - we'll help you research this.",
    "validation": {
      "minLength": 10,
      "maxLength": 300
    }
  }
]

Generate ${questionCount} questions now that work for ANY market, ANY context.
Let the USER provide the specifics in their answers!

Return ONLY the JSON array.`

  try {
    const response = await retryWithBackoff(async () => {
      console.log(`[QUESTION_GENERATION] Calling Claude API (complexity: ${complexity}, questions: ${questionCount})`)
      
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',  // ✅ Keep
        max_tokens: 5000,                    // ↑ Increase slightly
        temperature: 0.5,                    // ↓ Lower slightly
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      return completion.content[0]?.type === 'text' ? completion.content[0].text : ''
    }, 3, 1000)

    // Clean response (remove markdown code blocks if Claude adds them)
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '')
    }
    cleanedResponse = cleanedResponse.trim()

    // Parse JSON
    const questions: Question[] = JSON.parse(cleanedResponse)

    // Validate questions structure
    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array')
    }

    if (questions.length < 5 || questions.length > 12) {
      throw new Error(`Invalid question count: ${questions.length}. Expected 5-12 questions.`)
    }

    // Validate each question
    questions.forEach((q, index) => {
      if (!q.id || !q.type || !q.text) {
        throw new Error(`Question ${index + 1}: Missing required fields (id, type, or text)`)
      }

      const validTypes: QuestionType[] = ['text', 'textarea', 'radio', 'checkbox', 'select', 'number']
      if (!validTypes.includes(q.type)) {
        throw new Error(`Question ${index + 1}: Invalid type "${q.type}". Must be one of: ${validTypes.join(', ')}`)
      }

      // Validate options for choice-based questions
      if (['radio', 'checkbox', 'select'].includes(q.type)) {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question ${index + 1} (${q.type}): Must have at least 2 options`)
        }
      }

      // Validate number questions
      if (q.type === 'number' && q.validation) {
        if (typeof q.validation.min !== 'number' || typeof q.validation.max !== 'number') {
          throw new Error(`Question ${index + 1} (number): Must have min and max in validation`)
        }
      }
    })

    console.log(`[QUESTION_GENERATION] Successfully generated and validated ${questions.length} questions`)
    return questions

  } catch (error) {
    console.error('[QUESTION_GENERATION] AI generation failed:', error)
    throw error
  }
}

/**
 * Shared utility: Start question generation for an idea
 * Handles rate limiting, status update, and background job triggering
 * 
 * @param ideaId - The idea ID to generate questions for
 * @param ideaText - The idea text to generate questions from
 * @param userId - The user ID (for rate limiting)
 * @param supabase - Authenticated Supabase client
 * @param authHeader - Optional auth header for token fallback
 * @returns Object with success status and any error message
 */
export async function startQuestionGeneration(
  ideaId: string,
  ideaText: string,
  userId: string,
  supabase: SupabaseClient,
  authHeader: string | null = null
): Promise<{ success: boolean; error?: string }> {
  // Step 1: Check rate limit (max 3 concurrent generations per user)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { count, error: countError } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['generating_questions', 'generating_stage1'])
    .gte('created_at', fiveMinutesAgo)

  if (countError) {
    console.error('[QUESTION_GENERATION] Failed to check pending generations:', countError)
    // Don't block - continue anyway (graceful degradation)
  }

  if (count && count >= 3) {
    return {
      success: false,
      error: 'You have too many ideas generating. Please wait for them to complete before starting another one.'
    }
  }

  // Step 2: Update status to 'generating_questions'
  const { error: updateError } = await supabase
    .from('ideas')
    .update({
      status: 'generating_questions'
    })
    .eq('id', ideaId)

  if (updateError) {
    console.error('[QUESTION_GENERATION] Failed to update idea status:', updateError)
    return {
      success: false,
      error: 'Failed to start question generation. Please try again.'
    }
  }

  // Step 3: Get auth token for background job (prefer header, fallback to session)
  let authToken: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    authToken = authHeader.replace('Bearer ', '')
  }

  if (!authToken) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        authToken = session.access_token
      }
    } catch (sessionError) {
      console.error('[QUESTION_GENERATION] Failed to get session for token fallback:', sessionError)
    }
  }

  // Step 4: If no token, update status to failed and return
  if (!authToken) {
    await supabase
      .from('ideas')
      .update({
        status: 'generation_failed',
        error_message: 'Missing authentication token for question generation',
        error_occurred_at: new Date().toISOString()
      })
      .eq('id', ideaId)
    
    return {
      success: false,
      error: 'Missing authentication token for question generation'
    }
  }

  // Step 5: Start question generation in background (fire and forget)
  console.log(`[QUESTION_GENERATION] Starting generation for idea ${ideaId}`)
  
  generateQuestionsAsync(ideaId, ideaText)
    .catch((error) => {
      // Error is already logged and status updated in generateQuestionsAsync
      console.error(`[QUESTION_GENERATION] Background generation failed for idea ${ideaId}:`, error)
    })

  return { success: true }
}

/**
 * Main function: Generate questions and update database
 * This runs in the background (fire-and-forget from API route)
 */
export async function generateQuestionsAsync(
  ideaId: string,
  ideaText: string
): Promise<void> {
  console.log(`[QUESTION_GENERATION] Starting generation for idea ${ideaId}`)

  // Validate environment variables before proceeding
  const supabaseServiceKey = getSupabaseServiceKey()
  getAnthropicApiKey() // Validate API key is present

  // Use service role key for background operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Generate questions using AI
    const questions = await generateQuestionsWithAI(ideaText)

    console.log(`[QUESTION_GENERATION] Generated ${questions.length} questions for idea ${ideaId}`)

    // Update idea with questions
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        questions,
        total_questions: questions.length,
        status: 'questions_ready',
        questions_generated_at: new Date().toISOString()
      })
      .eq('id', ideaId)

    if (updateError) {
      console.error('[QUESTION_GENERATION] Failed to update idea with questions:', updateError)
      throw new Error(`Failed to save questions: ${updateError.message}`)
    }

    console.log(`[QUESTION_GENERATION] Successfully saved questions for idea ${ideaId}`)

  } catch (error) {
    console.error(`[QUESTION_GENERATION] Error for idea ${ideaId}:`, error)

    // Update idea status to indicate failure
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('ideas')
        .update({
          status: 'generation_failed',
          error_message: errorMessage,
          error_occurred_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      console.log(`[QUESTION_GENERATION] Updated idea ${ideaId} status to generation_failed`)
    } catch (updateError) {
      console.error('[QUESTION_GENERATION] Failed to update error status:', updateError)
    }

    // Re-throw so caller knows it failed
    throw error
  }
}

// Prompt snippet for Stage 1 analysis (context-aware, no assumptions)
export const stage1Prompt = `
You are analyzing a startup idea based on the founder's answers.

CRITICAL: The answers contain THEIR SPECIFIC CONTEXT:
- Their target market (could be any country)
- Their actual competitors (not assumptions)
- Their actual constraints (budget, tech, regulations)

DO NOT make assumptions! Analyze based on THEIR context.

Example:
If they say: "Target market: Rural India, farmers use SMS"
→ DON'T recommend: "Build iOS/Android app"
→ DO recommend: "SMS-based solution matches customer tech"

If they say: "Budget: $15,000"
→ DON'T say: "You need $500K to compete"
→ DO say: "Budget is tight - focus on MVP, seek partnerships"

If they say: "Competitors: Local radio broadcasts"
→ DON'T compare to: "Uber, Weather Underground"
→ DO analyze: Speed advantage over 2-3 day radio delays

ANALYZE THEIR ACTUAL SITUATION, not a generic startup!
`
