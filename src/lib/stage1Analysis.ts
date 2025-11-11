import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { callAnthropicWithRetry } from './anthropicRetry'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

// Lazy getters - only check when actually needed
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

function getSerperApiKey(): string {
  const key = process.env.SERPER_API_KEY
  if (!key) {
    throw new Error('Missing environment variable: SERPER_API_KEY')
  }
  return key
}

// Types
interface CompetitorCandidate {
  name: string
  website?: string
  description?: string
  source: string
}

interface AnalyzedCompetitor {
  name: string
  website?: string
  relevance: 'direct' | 'indirect' | 'none'
  threat_level: number
  key_features: string[]
  positioning?: {
    target_market: string
    price_tier: 'budget' | 'mid-range' | 'premium' | 'enterprise'
    price_details: string
    key_strengths: string
    company_stage: 'well-funded' | 'bootstrapped' | 'enterprise' | 'startup' | 'unknown'
    geographic_focus: string // e.g., "Global", "India", "Hyderabad", "US", etc.
  }
  our_differentiation?: string // Enhanced: Ultra-specific to founder's context
  keep: boolean
}

interface RiskAnalysis {
  overall_score: number
  category_scores: {
    business_viability: number
    market_timing: number
    competition_level: number
    execution_difficulty: number
  }
  explanations: {
    business_viability: string
    market_timing: string
    competition_level: string
    execution_difficulty: string
  }
  risk_level: 'Low' | 'Medium' | 'High'
  top_risks: Array<{
    title: string
    severity: number
    category: string
    why_it_matters: string
    mitigation_steps: string[]
    timeline: 'Before starting' | 'During validation' | 'During MVP development' | 'Before launch' | 'Post-launch'
  }>
  demo_comparison?: {
    has_demo: boolean
    demo_score?: number
    demo_risk_score?: number
    score_difference?: number
    risk_difference?: number
    category_changes?: Record<string, { demo_score: number; change: number }>
  }
}

interface AIInsights {
  recommendation: {
    verdict: 'proceed' | 'needs_work'  // 'pivot' removed - always use 'needs_work' for high risk
    verdict_label: string
    confidence: number
    summary: string
    requirements: string[]  // Changed from 'conditions' to 'requirements'
    next_steps: string[]
  }
  score_factors: Array<{
    factor: string
    impact: string
    category: string
  }>
}

// Calculate weighted risk score
function calculateRiskScore(categoryScores: {
  competition_level: number
  business_viability: number
  market_timing: number
  execution_difficulty: number
}): number {
  const weights = {
    competition_level: 0.35,
    business_viability: 0.25,
    market_timing: 0.20,
    execution_difficulty: 0.20
  }

  const weightedScore =
    categoryScores.competition_level * weights.competition_level +
    categoryScores.business_viability * weights.business_viability +
    categoryScores.market_timing * weights.market_timing +
    categoryScores.execution_difficulty * weights.execution_difficulty

  return Math.round(weightedScore * 10) / 10
}

// Extract company name from title or URL (handles articles AND page titles)
function extractCompanyName(title: string, url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    const domain = hostname.split('.')[0]
    
    // List of domains that are article/news/review sites (not company sites)
    const articleSites = [
      'techcrunch', 'forbes', 'businessinsider', 'theverge', 'wired',
      'reuters', 'bloomberg', 'cnbc', 'venturebeat', 'mashable',
      'engadget', 'arstechnica', 'zdnet', 'cnet', 'medium', 'gartner',
      'capterra', 'g2', 'trustradius', 'softwareadvice', 'getapp',
      'expertmarket', 'efficient', 'superagi', 'lucid',
      'visitcalifornia', 'tripadvisor', 'yelp', 'producthunt'  // ← Added location/review sites
    ]
    
    const isArticleSite = articleSites.includes(domain.toLowerCase())
    
    // List of generic page title keywords that indicate this is a PAGE, not the company name
    const genericPageWords = [
      'tour', 'tours', 'visit', 'book', 'booking', 'reservation',
      'about', 'contact', 'services', 'products', 'home', 'welcome',
      'experience', 'education', 'learn', 'center', 'shop', 'store',
      'blog', 'news', 'events', 'gallery', 'testimonials', 'faq'
    ]
    
    // Helper: Check if title is likely a page title (not company name)
    const isGenericPageTitle = (text: string): boolean => {
      const words = text.toLowerCase().split(/\s+/)
      // If 50%+ of words are generic page words, it's likely a page title
      const genericWordCount = words.filter(word => 
        genericPageWords.some(generic => word.includes(generic))
      ).length
      return genericWordCount >= Math.ceil(words.length * 0.5)
    }
    
    // If this is an article site, extract company name from title or URL
    if (isArticleSite) {
      // Pattern 1: "... - CompanyName" (e.g., "Top 7 Competitors - Brex")
      const dashPattern = title.match(/\s*[-–—]\s*([A-Z][A-Za-z0-9\s&.]+)$/i)
      if (dashPattern) {
        const extracted = dashPattern[1].trim()
        const genericPhrases = ['and more', 'comparison', 'review', 'guide', 'blog', 'article']
        if (!genericPhrases.some(phrase => extracted.toLowerCase().includes(phrase))) {
          return extracted
        }
      }
      
      // Pattern 2: "CompanyName: Description" (e.g., "Stripe: Payment Processing")
      const colonPattern = title.match(/^([A-Z][A-Za-z0-9\s&.]+?)\s*[:\-–—]/)
      if (colonPattern) {
        return colonPattern[1].trim()
      }
      
      // Pattern 3: Extract from URL path
      const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0)
      for (const segment of pathSegments) {
        const words = segment.split('-').filter(w => w.length > 2)
        if (words.length > 0 && words.length < 4) {
          const companyName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          if (companyName.length > 2 && !isGenericPageTitle(companyName)) {
            return companyName
          }
        }
      }
      
      // Fallback: Use domain name
      return domain.charAt(0).toUpperCase() + domain.slice(1)
    }
    
    // For actual company websites (non-article sites)
    // CRITICAL: Check if title is a generic page title first
    const titleMatch = title.match(/^([^:–—\-\|]+)/)
    if (titleMatch) {
      const extracted = titleMatch[1].trim()
      
      // If title is short, capitalized, AND not a generic page title → use it
      if (extracted.length < 50 && 
          /^[A-Z]/.test(extracted) && 
          !isGenericPageTitle(extracted)) {
        return extracted
      }
    }
    
    // Title is generic or too long → Extract company name from domain
    // Convert domain to readable company name
    // e.g., "temalpakhfarm" → "Temalpakh Farm"
    //       "bharatvarshnaturefarms" → "Bharatvarsh Nature Farms"
    
    // Try to split camelCase or compound words intelligently
    let companyName = domain
    
    // Strategy 1: Look for common suffixes and split there
    const commonSuffixes = ['farm', 'farms', 'tours', 'tour', 'co', 'inc', 'llc', 'corp']
    for (const suffix of commonSuffixes) {
      if (domain.toLowerCase().endsWith(suffix)) {
        const baseName = domain.slice(0, -suffix.length)
        const suffixPart = domain.slice(-suffix.length)
        companyName = baseName.charAt(0).toUpperCase() + baseName.slice(1) + ' ' +
                     suffixPart.charAt(0).toUpperCase() + suffixPart.slice(1)
        return companyName
      }
    }
    
    // Strategy 2: Just capitalize first letter if nothing else works
    return domain.charAt(0).toUpperCase() + domain.slice(1)
    
  } catch {
    // If URL parsing fails, use title
    const titleMatch = title.match(/^([^:–—\-\|]+)/)
    if (titleMatch) {
      return titleMatch[1].trim()
    }
    return title
  }
}


// Normalize URL for deduplication - extract ONLY the domain
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove www., keep ONLY hostname (no path, no protocol)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    // If URL parsing fails, normalize manually
    return url.toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
      .replace(/\/.*$/, '') // Remove everything after first slash
  }
}

// Deduplicate competitors by domain (simplified)
function deduplicateCompetitors(competitors: CompetitorCandidate[]): CompetitorCandidate[] {
  const seenDomains = new Map<string, CompetitorCandidate>()

  for (const competitor of competitors) {
    // Get normalized domain
    const domain = competitor.website 
      ? normalizeUrl(competitor.website)  // Just the domain now
      : competitor.name.toLowerCase().replace(/\s+/g, '')

    // Check if we've seen this domain
    if (seenDomains.has(domain)) {
      const existing = seenDomains.get(domain)!
      console.log(`[STAGE1] Skipping duplicate: ${competitor.name} (${competitor.website}) - already have: ${existing.name} (${existing.website})`)
      continue
    }

    // First time seeing this domain
    seenDomains.set(domain, competitor)
  }

  const deduplicated = Array.from(seenDomains.values())
  console.log(`[STAGE1] Deduplicated ${competitors.length} → ${deduplicated.length} competitors`)
  
  return deduplicated
}

// Layer 1: Serper Web Search with Wizard Context
async function searchCompetitorsWithSerper(
  ideaText: string,
  solution: string,
  wizardAnswers?: Record<string, unknown>
): Promise<CompetitorCandidate[]> {
  const serperApiKey = getSerperApiKey()

  // Build smart queries using wizard context
  const baseQueries = [
    `${ideaText} competitors`,
    `${solution} alternatives`
  ]

  // Add context-specific queries if wizard data available
  const contextQueries: string[] = []

  if (wizardAnswers) {
    // Extract target customer for more specific search
    const targetCustomerKey = Object.keys(wizardAnswers).find(
      k =>
        k.toLowerCase().includes('target') ||
        k.toLowerCase().includes('customer') ||
        k.toLowerCase().includes('audience')
    )
    if (targetCustomerKey && wizardAnswers[targetCustomerKey]) {
      const targetCustomer = String(wizardAnswers[targetCustomerKey])
      // Extract key terms (first 3-5 words)
      const keywords = targetCustomer
        .split(' ')
        .slice(0, 5)
        .join(' ')
      contextQueries.push(`${ideaText} ${keywords} competitors`)
    }

    // Extract location for geo-specific search
    const locationKey = Object.keys(wizardAnswers).find(
      k =>
        k.toLowerCase().includes('location') ||
        k.toLowerCase().includes('geographic') ||
        k.toLowerCase().includes('market')
    )
    if (locationKey && wizardAnswers[locationKey]) {
      const location = String(wizardAnswers[locationKey])
      contextQueries.push(`${ideaText} ${location} alternatives`)
    }

    // Check business type for B2B/B2C specific search
    const businessTypeKey = Object.keys(wizardAnswers).find(
      k => k.toLowerCase().includes('business') && k.toLowerCase().includes('type')
    )
    if (businessTypeKey && wizardAnswers[businessTypeKey]) {
      const businessType = String(wizardAnswers[businessTypeKey])
      if (businessType.toLowerCase().includes('b2b')) {
        contextQueries.push(`${ideaText} B2B enterprise software`)
      }
    }
  }

  // Combine queries (max 4 to control cost)
  const queries = [...baseQueries, ...contextQueries, `best ${solution} alternatives`].slice(0, 4)

  console.log(`[STAGE1] Serper queries:`, queries)

  // Search all queries in parallel
  const searchResults = await Promise.all(
    queries.map(query =>
      fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query })
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Serper API error: ${res.status}`)
          }
          return res.json()
        })
        .catch(error => {
          console.warn(`[STAGE1] Serper search failed for "${query}":`, error)
          return { organic: [], peopleAlsoAsk: [] } // Return empty result on error
        })
    )
  )

  // Extract competitors from search results
  const competitors: CompetitorCandidate[] = []

  for (const result of searchResults) {
    // Extract from organic results
    if (result.organic && Array.isArray(result.organic)) {
      for (const item of result.organic) {
        if (item.title && item.link) {
          competitors.push({
            name: extractCompanyName(item.title, item.link),
            website: item.link,
            description: item.snippet,
            source: 'serper_search'
          })
        }
      }
    }
  }

  // Deduplicate by company name and website
  return deduplicateCompetitors(competitors)
}

// Helper: Analyze a single batch of competitors
async function analyzeCompetitorBatch(
  ideaContext: {
    problem: string
    audience: string
    solution: string
  },
  batch: CompetitorCandidate[],
  wizardAnswers: Record<string, unknown>,
  anthropic: Anthropic
): Promise<AnalyzedCompetitor[]> {
  if (batch.length === 0) {
    return []
  }

  // Extract key context from wizard answers
  const extractAnswer = (keywords: string[]): string | null => {
    const key = Object.keys(wizardAnswers).find(k =>
      keywords.some(keyword => k.toLowerCase().includes(keyword))
    )
    return key ? String(wizardAnswers[key]) : null
  }

  const targetCustomer = extractAnswer(['target', 'customer', 'audience'])
  const location = extractAnswer(['location', 'geographic', 'market'])
  const experience = extractAnswer(['experience', 'background', 'expertise'])
  const budget = extractAnswer(['budget', 'funding', 'capital'])
  const commitment = extractAnswer(['commitment', 'time', 'availability'])
  const technical = extractAnswer(['technical', 'tech', 'capability', 'skill'])

  const prompt = `
You are analyzing competitors for this startup idea:

Problem: ${ideaContext.problem}
Audience: ${ideaContext.audience}
Solution: ${ideaContext.solution}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDER'S SPECIFIC CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${targetCustomer ? `Target Customer: ${targetCustomer}` : ''}
${location ? `Location/Market: ${location}` : ''}
${experience ? `Industry Experience: ${experience}` : ''}
${budget ? `Available Budget: ${budget}` : ''}
${commitment ? `Commitment Level: ${commitment}` : ''}
${technical ? `Technical Capability: ${technical}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Discovered Competitors (batch):
${JSON.stringify(batch, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each competitor, determine:

1. **Relevance**: "direct" | "indirect" | "none"
   - Direct: Targets same customers with similar solution
   - Indirect: Adjacent market or different approach
   - None: Not a real competitor

2. **Threat Level**: 1-10 (10 = highest threat)
   - Consider: their funding, market position, feature set
   
3. **Key Features**: Array of 3-5 main features
   - Extract from their description or infer from their positioning

4. **Positioning**: Structured object with:
   {
     "target_market": "WHO they target (customer segment, company size)",
     "price_tier": "budget" | "mid-range" | "premium" | "enterprise",
     "price_details": "Actual price range if known, e.g. '$150-250/month' or 'Contact for pricing'",
     "key_strengths": "WHY customers choose them (main value prop)",
     "company_stage": "well-funded" | "bootstrapped" | "enterprise" | "startup" | "unknown",
     "geographic_focus": "Global" | "India" | "Hyderabad" | "US" | "[Country]" | "[Region]"
   }
   
5. **Our Differentiation**: HOW THIS FOUNDER CAN COMPETE (30-60 words)
   
   **CRITICAL**: Make this ULTRA SPECIFIC to the founder's context:
   
   ${targetCustomer ? `- They're targeting: "${targetCustomer}" (use this for positioning)` : ''}
   ${location ? `- They're in: "${location}" (local advantage? regional focus?)` : ''}
   ${experience ? `- They have: "${experience}" (domain expertise advantage?)` : ''}
   ${budget ? `- Their budget: "${budget}" (pricing strategy? lean approach?)` : ''}
   ${commitment ? `- Their commitment: "${commitment}" (timeline implications?)` : ''}
   ${technical ? `- Technical skills: "${technical}" (build vs buy decisions?)` : ''}
   
   **Examples of GOOD differentiation statements:**
   - "Target small Napa vineyards (10-200 acres) vs their focus on large commercial farms (1000+ acres). Leverage your 15 years wine industry experience to offer wine-grape-specific disease models they lack. Undercut their $199/mo pricing at $99/mo since you're part-time with lower burn rate."
   
   - "They target enterprise ($500K+ budgets). You can win SMBs ($10K-50K budgets) by offering simplified feature set that takes 1 week to implement vs their 3-month enterprise onboarding. Your technical background means you can build MVP yourself, avoiding their $100K setup fees."
   
   **Examples of BAD (generic) differentiation:**
   - "Better UX and faster implementation" ❌
   - "More affordable pricing" ❌
   - "Focus on customer service" ❌
   
6. **Keep**: true/false
   - Keep = true if relevant competitor
   - Keep = false if false positive (not actually a competitor)

Return ONLY a valid JSON array with analyzed competitors:
[
  {
    "name": "Company Name",
    "website": "https://...",
    "relevance": "direct",
    "threat_level": 7,
    "key_features": ["feature1", "feature2", "feature3"],
    
    "positioning": {
      "target_market": "Mid-to-large farms (500-5000 acres)",
      "price_tier": "mid-range",
      "price_details": "$150-250/month",
      "key_strengths": "General crop management and mobile accessibility",
      "company_stage": "well-funded",
      "geographic_focus": "Global"
    },
    
    "our_differentiation": "They focus on Fortune 500 companies with $100K+ budgets. You can capture small wineries (10-50 employees) in Napa Valley specifically by leveraging your 15 years wine industry experience to offer wine-grape disease prediction at $99/mo vs their $500/user. Your part-time commitment means lower burn rate.",
    "keep": true
  }
]

Do not include markdown code blocks, only return the JSON array.
`

  try {
    const response = await callAnthropicWithRetry(
      () => anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }]
      }),
      {
        maxRetries: 3,
        initialDelay: 2000,
        operationName: 'Competitor Analysis'
      }
    )

    const analysisText = response.content[0]?.type === 'text' ? response.content[0].text : '[]'

    // Log raw Claude response for testing
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[STAGE1] 🧪 TESTING: Raw Claude Response (Competitor Analysis)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(analysisText)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Parse JSON (handle markdown code blocks)
    let cleanText = analysisText
    if (cleanText.includes('```json')) {
      cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '')
    }
    if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '')
    }

    const jsonMatch = cleanText.match(/\[[\s\S]*\]/)
    let parsed: AnalyzedCompetitor[] = []
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as AnalyzedCompetitor[]
        
        // Log parsed JSON for testing
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[STAGE1] 🧪 TESTING: Parsed JSON (Competitor Analysis)')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(JSON.stringify(parsed, null, 2))
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      } catch (parseError) {
        console.error('[STAGE1] Failed to parse competitor analysis JSON:', parseError)
        console.error('[STAGE1] Clean text that failed to parse:', cleanText.substring(0, 500))
        return []
      }
    }

    // Filter to only relevant competitors
    const filtered = parsed.filter((c: AnalyzedCompetitor) => c.keep && c.relevance !== 'none')
    
    return filtered
  } catch (error) {
    console.error('[STAGE1] Claude competitor batch analysis failed after retries:', error)
    throw error // Re-throw so batch processing can handle it
  }
}

// Layer 2: Claude Analysis with Wizard Context (batched processing)
async function analyzeCompetitorsWithClaude(
  ideaContext: {
    problem: string
    audience: string
    solution: string
  },
  competitors: CompetitorCandidate[],
  wizardAnswers: Record<string, unknown>,
  anthropic: Anthropic
): Promise<AnalyzedCompetitor[]> {
  if (competitors.length === 0) {
    return []
  }

  const BATCH_SIZE = 8 // Analyze 8 at a time instead of all at once
  const analyzed: AnalyzedCompetitor[] = []

  console.log(`[STAGE1] Processing ${competitors.length} competitors in batches of ${BATCH_SIZE}`)

  for (let i = 0; i < competitors.length; i += BATCH_SIZE) {
    const batch = competitors.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(competitors.length / BATCH_SIZE)
    
    console.log(`[STAGE1] Analyzing batch ${batchNum}/${totalBatches} (${batch.length} competitors)`)
    
    try {
      const batchResults = await analyzeCompetitorBatch(
        ideaContext,
        batch,
        wizardAnswers,
        anthropic
      )
      analyzed.push(...batchResults)
      console.log(`[STAGE1] ✅ Batch ${batchNum} complete: ${batchResults.length} relevant competitors found`)
    } catch (error) {
      console.error(`[STAGE1] ❌ Batch ${batchNum}/${totalBatches} failed:`, error)
      // Continue with next batch instead of failing completely
    }
  }

  console.log(`[STAGE1] ✅ Competitor analysis complete: ${analyzed.length} relevant competitors found across ${Math.ceil(competitors.length / BATCH_SIZE)} batches`)
  
  return analyzed
}

// Generate problem/audience/solution/monetization from wizard answers
async function generateCoreFieldsFromWizard(
  ideaText: string,
  wizardAnswers: Record<string, unknown>,
  anthropic: Anthropic
): Promise<{
  problem: string
  audience: string
  solution: string
  monetization: string
}> {
  try {
    const prompt = `
You are analyzing a startup idea based on the founder's detailed answers.

Idea: ${ideaText}

Wizard Answers:
${JSON.stringify(wizardAnswers, null, 2)}

Extract and synthesize the following from the wizard answers:

1. **Problem**: What specific problem does this solve?
   - Be specific and concrete
   - Extract the pain point clearly stated

2. **Audience**: Who is the target audience?
   - Extract whatever specificity the founder provided
   - If vague, state what IS known without negative commentary
   - GOOD: "Businesses in India"
   - GOOD: "Small to medium businesses in India (10-100 employees)"
   - BAD: "Businesses in India (founder has not identified specific segment)" ❌
   - If truly undefined, say: "To be determined through customer discovery"

3. **Solution**: What is the proposed solution?
   - Be comprehensive and detailed
   - Extract all features and capabilities mentioned

4. **Monetization**: How will this make money?
   - Extract any hints about pricing or revenue model
   - If unclear, be constructive, not critical
   - GOOD: "Subscription-based model (pricing to be validated)"
   - GOOD: "To be determined - likely SaaS or transaction-based model"
   - GOOD: "Freemium approach with premium features"
   - BAD: "Undecided - no monetization model determined" ❌
   - If truly no hints, say: "To be determined based on target customer feedback"

**CRITICAL RULES:**
- Be professional and constructive
- Never criticize the founder ("has not identified", "undecided", etc.)
- If information is incomplete, state what IS known
- Frame unknowns as "to be determined" rather than "not decided"
- Use positive, actionable language

Return ONLY a valid JSON object:
{
  "problem": "...",
  "audience": "...",
  "solution": "...",
  "monetization": "..."
}

Do not include markdown code blocks, only return the JSON object.
`

    const response = await callAnthropicWithRetry(
      () => anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      }),
      { operationName: 'Generate Core Fields from Wizard' }
    )

    const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '{}'

    // Parse JSON
    let cleanText = responseText
    if (cleanText.includes('```json')) {
      cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '')
    }
    if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '')
    }

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    let parsed: {
      problem?: string
      audience?: string
      solution?: string
      monetization?: string
    } = {}
    
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as typeof parsed
      } catch (parseError) {
        console.warn('[STAGE1] Failed to parse core fields JSON:', parseError)
        // parsed remains {} - will use fallback values
      }
    }

    return {
      problem: parsed.problem || '',
      audience: parsed.audience || '',
      solution: parsed.solution || '',
      monetization: parsed.monetization || ''
    }
  } catch (error) {
    console.error('[STAGE1] Core fields generation failed:', error)
    // Return empty strings - analysis can continue without core fields
    // They will be generated again later if needed, or analysis proceeds with existing values
    return {
      problem: '',
      audience: '',
      solution: '',
      monetization: ''
    }
  }
}

// Format wizard answers with question context for better AI understanding
function formatWizardAnswersForAnalysis(
  wizardAnswers: Record<string, unknown>,
  questions: Array<{ id: string; text: string }> | null
): string {
  if (!wizardAnswers || Object.keys(wizardAnswers).length === 0) {
    return 'No wizard answers provided.'
  }

  // Create a map of question IDs to question text
  const questionMap = new Map<string, string>()
  if (questions && Array.isArray(questions)) {
    for (const question of questions) {
      questionMap.set(question.id, question.text)
    }
  }

  // Format answers with context
  const formattedAnswers: string[] = []
  
  for (const [questionId, answer] of Object.entries(wizardAnswers)) {
    const questionText = questionMap.get(questionId) || questionId
    const answerText = Array.isArray(answer) 
      ? answer.join(', ') 
      : String(answer)
    
    formattedAnswers.push(`Q: ${questionText}\nA: ${answerText}`)
  }

  return formattedAnswers.join('\n\n')
}

// Extract key insights from wizard answers
function extractKeyInsights(wizardAnswers: Record<string, unknown>): {
  startupBudget?: number           // Changed: What founder has to launch
  marketSpending?: string          // New: What customers currently pay
  technicalCapability?: string
  targetMarket?: string
  existingSolutions?: string
  regulatoryRequirements?: string
  teamSize?: number
  timeline?: string
} {
  const insights: {
    startupBudget?: number
    marketSpending?: string
    technicalCapability?: string
    targetMarket?: string
    existingSolutions?: string
    regulatoryRequirements?: string
    teamSize?: number
    timeline?: string
  } = {}

  const answerKeys = Object.keys(wizardAnswers).map(k => k.toLowerCase())

  // Extract STARTUP budget (what THEY have to launch the business)
  // Works for: SaaS, physical products, services, physical locations
  const startupBudgetKey = answerKeys.find(k => 
    (k.includes('startup') && k.includes('budget')) ||
    (k.includes('available') && k.includes('budget')) ||
    (k.includes('launch') && k.includes('budget')) ||
    (k.includes('development') && k.includes('budget')) ||
    (k === 'budget' && !k.includes('customer') && !k.includes('market'))
  )
  
  if (startupBudgetKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === startupBudgetKey)
    if (originalKey) {
      const budgetValue = wizardAnswers[originalKey]
      if (typeof budgetValue === 'number') {
        insights.startupBudget = budgetValue
      } else if (typeof budgetValue === 'string') {
        const numMatch = budgetValue.match(/\d+/)
        if (numMatch) {
          insights.startupBudget = parseInt(numMatch[0], 10)
        }
      }
    }
  }

  // Extract MARKET spending (what customers CURRENTLY pay competitors)
  const marketSpendingKey = answerKeys.find(k =>
    (k.includes('customer') && k.includes('budget')) ||
    (k.includes('market') && k.includes('spending')) ||
    (k.includes('customer') && k.includes('spend')) ||
    (k.includes('current') && k.includes('market'))
  )
  
  if (marketSpendingKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === marketSpendingKey)
    if (originalKey) {
      insights.marketSpending = String(wizardAnswers[originalKey])
    }
  }

  // Extract technical capability
  const techKey = answerKeys.find(
    k => k.includes('technical') || k.includes('tech') || k.includes('capability') || k.includes('skill')
  )
  if (techKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === techKey)
    if (originalKey) {
      insights.technicalCapability = String(wizardAnswers[originalKey])
    }
  }

  // Extract target market
  const marketKey = answerKeys.find(
    k => (k.includes('target') && k.includes('market')) || 
         k.includes('geographic') || 
         (k.includes('market') && !k.includes('spending'))
  )
  if (marketKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === marketKey)
    if (originalKey) {
      insights.targetMarket = String(wizardAnswers[originalKey])
    }
  }

  // Extract existing solutions
  const solutionsKey = answerKeys.find(
    k => k.includes('existing') || k.includes('competitor') || k.includes('alternative') || k.includes('current')
  )
  if (solutionsKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === solutionsKey)
    if (originalKey) {
      insights.existingSolutions = String(wizardAnswers[originalKey])
    }
  }

  // Extract regulatory requirements
  const regulatoryKey = answerKeys.find(
    k => k.includes('regulatory') || k.includes('regulation') || k.includes('compliance') || k.includes('certification')
  )
  if (regulatoryKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === regulatoryKey)
    if (originalKey) {
      insights.regulatoryRequirements = String(wizardAnswers[originalKey])
    }
  }

  // Extract team size
  const teamKey = answerKeys.find(k => k.includes('team') || k.includes('people') || k.includes('founder'))
  if (teamKey) {
    const originalKey = Object.keys(wizardAnswers).find(k => k.toLowerCase() === teamKey)
    if (originalKey) {
      const teamValue = wizardAnswers[originalKey]
      if (typeof teamValue === 'number') {
        insights.teamSize = teamValue
      }
    }
  }

  return insights
}

// Generate Stage 1 analysis (risk + AI insights)
async function generateStage1AnalysisWithAI(
  ideaText: string,
  problem: string,
  audience: string,
  solution: string,
  monetization: string,
  wizardAnswers: Record<string, unknown>,
  questions: Array<{ id: string; text: string }> | null,
  demoData: {
    score?: number
    risk_score?: number
    risk_analysis?: unknown
  } | null,
  competitors: AnalyzedCompetitor[], // ← Added to include competitor context in analysis
  anthropic: Anthropic
): Promise<{
  risk_analysis: RiskAnalysis
  ai_insights: AIInsights
  score: number
  risk_score: number
}> {
  // Import stage1Prompt from questionGeneration
  const { stage1Prompt } = await import('./questionGeneration')

  const hasDemo = !!demoData?.score && !!demoData?.risk_score

  // Format wizard answers with context
  const formattedAnswers = formatWizardAnswersForAnalysis(wizardAnswers, questions)
  
  // Extract key insights
  const keyInsights = extractKeyInsights(wizardAnswers)

  const prompt = `
You are a senior business analyst with 15+ years of experience evaluating startups.

${stage1Prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: ${problem}
Audience: ${audience}
Solution: ${solution}
Monetization: ${monetization}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FOUNDER'S DETAILED ANSWERS (USE THESE TO PERSONALIZE YOUR ANALYSIS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formattedAnswers}

KEY INSIGHTS EXTRACTED:
${keyInsights.startupBudget ? `- Startup Budget (What You Have to Launch): $${keyInsights.startupBudget.toLocaleString()}` : ''}
${keyInsights.marketSpending ? `- Market Spending Intelligence (What Customers Currently Pay): ${keyInsights.marketSpending}` : ''}
${keyInsights.technicalCapability ? `- Technical Capability: ${keyInsights.technicalCapability}` : ''}
${keyInsights.targetMarket ? `- Target Market: ${keyInsights.targetMarket}` : ''}
${keyInsights.existingSolutions ? `- Existing Solutions in Market: ${keyInsights.existingSolutions.substring(0, 200)}...` : ''}
${keyInsights.regulatoryRequirements ? `- Regulatory Requirements: ${keyInsights.regulatoryRequirements.substring(0, 200)}...` : ''}
${keyInsights.teamSize ? `- Team Size: ${keyInsights.teamSize}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL: DO NOT CONFUSE STARTUP BUDGET WITH MARKET SPENDING ⚠️

There are TWO COMPLETELY DIFFERENT budget concepts in the data above:

1. **STARTUP BUDGET** = Money the FOUNDER has to LAUNCH the business
   - This is THEIR money to build/launch/operate
   - Use THIS for ALL risk scoring (execution, viability, etc.)
   - Examples: "$10,000 available", "$50,000 seed funding"
   - Use for: "Can they build this?", "Do they have runway?", "Execution feasibility?"
   
2. **MARKET SPENDING INTELLIGENCE** = What CUSTOMERS currently pay for similar solutions
   - This is MARKET RESEARCH about customer spending habits
   - Use ONLY to understand competitive pricing landscape
   - DO NOT assume this is the founder's pricing
   - DO NOT criticize as "unvalidated pricing" - it's market research, not their pricing!
   - Examples: "Customers spend $500-1000 on consultants", "Market pays $50/month for SaaS"
   - Use for: Understanding willingness-to-pay, competitive context, pricing opportunity

**WRONG Analysis Examples (NEVER DO THIS):**
❌ "$500 budget severely limits marketing and development" (when they actually have $10,000)
❌ "Assumption that entrepreneurs will pay $500-1000 is unvalidated" (that's market research, not their pricing!)
❌ "$500 only covers API costs for 2 months" (wrong number - using market spending instead of startup budget!)
❌ "Insufficient budget for full product development" (while referencing wrong budget number)

**CORRECT Analysis Examples (DO THIS):**
✅ "$10,000 startup budget covers Serper API ($50-100/month), Claude API ($200-400/month), hosting ($20/month), leaving $8,000 for marketing"
✅ "Market research shows customers spend $500-1000 on alternatives, indicating willingness to pay premium prices. Founder's actual pricing strategy needs validation through customer interviews."
✅ "Strong technical skills + $10,000 startup budget = can build MVP without hiring developers, extending runway"
✅ "$10,000 provides 6-12 months runway at part-time pace (20-30 hrs/week) for validation and iteration"

**VERIFICATION CHECKLIST:**
Before finalizing your analysis, verify:
□ All budget mentions use the STARTUP BUDGET number (${keyInsights.startupBudget ? `$${keyInsights.startupBudget.toLocaleString()}` : 'unknown'})
□ Market spending is ONLY used for competitive context, never for execution feasibility
□ No statements like "assumption that they'll charge $X" when X comes from market research
□ Execution difficulty score reflects their ACTUAL startup budget, not market data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL: Use the founder's answers to personalize EVERY aspect of your analysis:

1. **EXECUTION DIFFICULTY:**
   ${keyInsights.technicalCapability ? `- Their technical capability: "${keyInsights.technicalCapability}"` : '- Consider their technical background'}
   ${keyInsights.startupBudget ? `- Their STARTUP budget: $${keyInsights.startupBudget.toLocaleString()} - use THIS for execution difficulty scoring` : '- Consider their available resources'}
   ${keyInsights.teamSize ? `- Team size: ${keyInsights.teamSize} people` : ''}
   → Score execution_difficulty based on THEIR actual capability and STARTUP BUDGET (not market spending!)

2. **MARKET TIMING:**
   ${keyInsights.targetMarket ? `- Their target market: "${keyInsights.targetMarket}"` : ''}
   ${keyInsights.existingSolutions ? `- Current solutions in their market: ${keyInsights.existingSolutions.substring(0, 150)}...` : ''}
   → Assess timing for THEIR specific market, not generic global market

3. **COMPETITION LEVEL:**
   ${keyInsights.existingSolutions ? `- They mentioned existing solutions: ${keyInsights.existingSolutions.substring(0, 150)}...` : ''}
   ${competitors.length > 0 ? `- Found ${competitors.length} competitors via research (see COMPETITORS section below)` : ''}
   → Rate competition based on what THEY identified AND the actual competitors discovered

4. **BUSINESS VIABILITY:**
   ${keyInsights.startupBudget ? `- Their STARTUP budget: $${keyInsights.startupBudget.toLocaleString()} - assess runway and scaling viability based on THIS` : ''}
   ${keyInsights.marketSpending ? `- Market spending intel: ${keyInsights.marketSpending} (use for competitive context, NOT as their pricing)` : ''}
   ${keyInsights.regulatoryRequirements ? `- Regulatory requirements: ${keyInsights.regulatoryRequirements.substring(0, 150)}...` : ''}
   → Assess viability based on THEIR actual startup budget and constraints
   → Market spending is CONTEXT about customers, not their pricing strategy

5. **RISK MITIGATION:**
   - Use their answers to suggest SPECIFIC, ACTIONABLE mitigation steps
   - Reference their actual STARTUP budget, technical capability, and market constraints
   - Provide timeline estimates based on their context

6. **SCORE FACTORS:**
   - Highlight factors from THEIR answers that improve/diminish the score
   - Example: "Strong technical background + $10,000 budget reduces execution risk"
   - Example: "Market research shows $500-1000 spending, indicating willingness to pay premium prices"
   - NEVER say: "$500 budget limits development" (use correct startupBudget number!)

${hasDemo ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DEMO COMPARISON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Demo Score: ${demoData.score}
Demo Risk Score: ${demoData.risk_score}

Compare your personalized analysis (based on wizard answers) with the demo analysis.
Show how the founder's specific context changed the assessment.
` : ''}

${competitors.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPETITORS DISCOVERED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${competitors.map((comp, idx) => `
${idx + 1}. **${comp.name}**${comp.website ? ` (${comp.website})` : ''}
   - Relevance: ${comp.relevance}${comp.relevance === 'direct' ? ' ⚠️' : ''}
   - Threat Level: ${comp.threat_level}/10${comp.threat_level >= 8 ? ' 🔴 Critical' : comp.threat_level >= 5 ? ' 🟠 High' : ' 🟡 Minor'}
   ${comp.positioning ? `- Target Market: ${comp.positioning.target_market}` : ''}
   ${comp.positioning ? `- Price Tier: ${comp.positioning.price_tier}` : ''}
   ${comp.key_features.length > 0 ? `- Key Features: ${comp.key_features.slice(0, 3).join(', ')}${comp.key_features.length > 3 ? '...' : ''}` : ''}
   ${comp.our_differentiation ? `- Our Differentiation: ${comp.our_differentiation.substring(0, 150)}${comp.our_differentiation.length > 150 ? '...' : ''}` : ''}
`).join('\n')}

**Use this competitor data to:**
- Accurately assess competition_level risk (reference actual competitors, not assumptions)
- Identify specific threats in top_risks (mention actual competitor names)
- Provide realistic differentiation strategies in recommendations
- Consider market saturation based on actual competitor count and threat levels
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provide a complete business analysis:

1. RISK ANALYSIS:
   Rate each risk category 0-10 where **HIGHER SCORE = HIGHER RISK**. Use the FULL scale, be decisive.
   
   Categories:
   
   - **business_viability** (0-10): Revenue model risk
     * 0-3 = Low risk (clear revenue model, validated demand, adequate funding)
     * 4-6 = Medium risk (some monetization ideas, needs validation)
     * 7-10 = High risk (no monetization, no validation, insufficient budget)
     Example: "No monetization model, $10K insufficient for AI fintech" → Score: 8-9
     
   - **market_timing** (0-10): Market readiness risk
     * 0-3 = Low risk (perfect timing, validated demand, market ready)
     * 4-6 = Medium risk (market emerging, some validation needed)
     * 7-10 = High risk (bad timing, no validation, market not ready)
     Example: "Hasn't validated demand or customer pain points" → Score: 6-7
     
   - **competition_level** (0-10): Competitive intensity risk
     * 0-3 = Low risk (few competitors, blue ocean, easy differentiation)
     * 4-6 = Medium risk (moderate competition, differentiation possible)
     * 7-10 = High risk (saturated, many established players, hard to compete)
     Example: "Zoho Expense, Razorpay, ClearTax and numerous established players" → Score: 9-10
     
   - **execution_difficulty** (0-10): Build complexity risk
     
     **CRITICAL: Don't just compare budget to full build cost!**
     
     Consider the LEAN PATH:
     1. Can they validate the core hypothesis with available budget?
        - Simple prototype, landing page, manual process?
        - MVP that proves the concept, not full product?
        
     2. Are there compensating factors?
        - Technical skills (can build vs. hire)
        - Time availability (nights/weekends extends runway)
        - Industry connections (free customer access)
        - Domain expertise (knows problem deeply)
        
     3. Can they raise funding AFTER proving concept?
        - Low score if can validate cheaply then raise
        - High score if needs capital before any validation
     
     **Scoring Guidelines:**
     * 0-3 = Low risk (can validate cheaply, has compensating factors, can raise after proof)
     * 4-6 = Medium risk (lean path exists but challenging, some compensating factors)
     * 7-10 = High risk (no lean validation path, no compensating factors, cannot raise after proof)
     
     **Examples:**
     ❌ "$10K insufficient for $100K AI product" → 9/10 (WRONG - too harsh)
     ✅ "$10K can validate core with $2K prototype, then raise $100K" → 6/10 (CORRECT - considers lean path)
     ✅ "$10K + senior engineer can build MVP themselves" → 4/10 (CORRECT - considers skills)
     ✅ "$10K + 6 months nights/weekends + industry connections" → 5/10 (CORRECT - considers all factors)
     
     **Score 7-10 ONLY if:**
     - No lean validation path exists
     - No compensating factors (skills, time, connections, expertise)
     - Cannot raise funding after proof of concept
     
     **Philosophy:**
     Don't ask "Do you have enough money to build v1.0?" (too harsh)
     Ask "Can you validate the hypothesis with what you have?" (realistic + optimistic)
   
   **For each category, provide:**
   - Score (0-10) - MUST match your explanation
   - Explanation (20-30 words) - MUST justify the score
   - **VERIFY: High score (7-10) = harsh/negative explanation**
   - **VERIFY: Low score (0-3) = positive/favorable explanation**
   
   Calculate overall_score as WEIGHTED AVERAGE:
   - competition_level × 0.35 (most important)
   - business_viability × 0.25
   - market_timing × 0.20
   - execution_difficulty × 0.20
   
   Risk level: "Low" (0-3.9), "Medium" (4-6.9), or "High" (7-10)
   
   Top 3 risks with:
   - title: Brief, clear title of the risk
   - severity: number 1-10 (how critical is this risk)
   - category: "Business Viability" | "Market Timing" | "Competition" | "Execution"
   - why_it_matters: 1-2 sentences explaining the impact
   - mitigation_steps: array of 2-4 specific, actionable steps to address this risk
   - timeline: When to execute the mitigation_steps above (REQUIRED)
   
   **TIMELINE FIELD - Use these EXACT labels:**
   
   "Before starting" 
     - Use when: Risk blocks starting or requires decision before ANY action
     - Example: "No monetization model defined" → Must decide pricing strategy before starting
     - This tells founder: "Resolve this before you do anything else"
     
   "During validation"
     - Use when: Mitigation requires customer interviews, market testing, or demand validation
     - Example: "Validate willingness-to-pay with 30 farmers" → Done during customer discovery phase
     - This tells founder: "Handle this while you're testing with customers"
     
   "During MVP development"
     - Use when: Mitigation happens while building the product
     - Example: "Hire technical team" or "Build prototype" → Done during development phase
     - This tells founder: "Address this while you're building"
     
   "Before launch"
     - Use when: Must be resolved before going live but can be worked on during development
     - Example: "Secure distribution partnerships" → Finalize before launch
     - This tells founder: "This must be ready before you go live"
     
   "Post-launch"
     - Use when: Can only be addressed after having customers/data
     - Example: "Monitor CAC and optimize based on data" → Ongoing after launch
     - This tells founder: "Track this once you have users"
   
   **CRITICAL RULES:**
   - Timeline tells the founder WHEN in their startup journey to execute the mitigation_steps
   - Choose the EARLIEST stage where mitigation can realistically begin
   - Use EXACTLY these labels (don't invent variations like "Pre-validation" or "Month 1")
   - Every risk MUST have a timeline (this is not optional)
   - The timeline should match the nature of the mitigation steps
   
   ${hasDemo ? `
   Demo Comparison:
   - Compare category scores with demo scores
   - Show score differences
   - Explain why scores changed based on wizard answers
   ` : ''}

2. AI INSIGHTS:

   **VERDICT RULES (Follow these EXACTLY - NO EXCEPTIONS):**
   
   First, calculate the overall weighted risk score from category scores.
   Then determine verdict based on risk score:
   
   - IF risk_score < 5.0 
     → verdict: "proceed"
     → label: "Strong Potential" (EXACTLY this text, no variations)
   
   - IF risk_score 5.0-6.9 
     → verdict: "needs_work"
     → label: "Promising - Address Constraints" (EXACTLY this text, no variations)
   
   - IF risk_score 7.0-8.4 
     → verdict: "needs_work"
     → label: "High Risk - Major Challenges" (EXACTLY this text, no variations)
   
   - IF risk_score ≥ 8.5 
     → verdict: "needs_work"
     → label: "Very High Risk - Reconsider Approach" (EXACTLY this text, no variations)
   
   **CRITICAL: Use ONLY these exact verdicts and labels. Do NOT use "pivot", "redirect", "Critical Preparation Required", or any other labels. Copy the labels EXACTLY as shown above.**
   
   For high-risk ideas (8.5+), your summary should:
   - Be honest about severe challenges
   - Reference specific competitors and constraints
   - Acknowledge if differentiation opportunities exist but execution is blocked
   - Use language like "This approach faces major obstacles" NOT "pivot recommended"
   
   - Recommendation: {
       verdict: "proceed" | "needs_work"  (ONLY these two options)
       verdict_label: string (use exact labels from above based on risk score)
       confidence: number (0-100)
       summary: string (2-3 sentences explaining the verdict)
       requirements: array of 3-5 REQUIREMENTS that must be met before proceeding
         - Frame as imperative actions: 'Validate...', 'Secure...', 'Build...'
         - Not past tense: NOT 'Validated...', 'Secured...', 'Built...'
         - Each should be a clear, measurable milestone
         - Strategic requirements, not tactical actions
         - Examples:
           ✅ 'Validate willingness-to-pay of ₹200/month with 30+ target farmers'
           ✅ 'Secure distribution partnership with FPO or extension network'
           ✅ 'Build technical team with meteorology expertise'
           ❌ 'Validated willingness-to-pay...' (past tense - sounds completed)
           ❌ 'Customer validation' (too vague)
           ❌ 'Interview farmers' (this is a next_step, not a requirement)
       next_steps: array of 3-5 IMMEDIATE ACTIONS
         - These are TASKS to execute in the next 2-4 weeks
         - Frame as "what to DO" - concrete, actionable, specific
         - Should help achieve the requirements above
         - Examples:
           ✅ "Interview 10 farmers to validate ₹200/month pricing"
           ✅ "Research 3-5 FPOs in target districts for partnerships"
           ✅ "Hire weather data scientist or meteorology consultant"
           ❌ "Validate pricing" (this is a requirement, not a next step)
           ❌ "Secure partnership" (this is a requirement, not a next step)
       
       **CRITICAL: requirements and next_steps should be COMPLEMENTARY, not redundant**
       - Requirements = WHAT must be done (imperative milestones)
       - Next Steps = HOW to do them (specific tactical actions)
     }
   - Score Factors: Array of 3-5 factors that influenced the score.
   
   **CRITICAL FORMAT RULES:**
   - Each factor should have: factor (string), impact (string), category (string)
   - The "factor" field should contain ONLY the description, NOT the impact
   - DO NOT include "- Positive -" or "- Negative -" in the factor text
   - The impact is already specified separately in the "impact" field
   
   **GOOD example:**
   {
     "factor": "₹10L budget provides adequate runway for MVP development and reduces execution risk compared to underfunded competitors",
     "impact": "positive",
     "category": "Business Viability"
   }
   
   **BAD example:**
   {
     "factor": "₹10L budget provides adequate runway... - Positive - sufficient funding...",  ❌
     "impact": "positive",
     "category": "Business Viability"
   }
   
   Structure:
   {
     "factor": "Clear, descriptive statement about what influences the score",
     "impact": "positive" | "negative",
     "category": "Business Viability" | "Market Timing" | "Competition" | "Execution"
   }

3. SCORE CALCULATION:
   Calculate overall score (0-100) based on:
   - Risk scores (lower risk = higher score)
   - Business viability
   - Market timing
   - Differentiation potential
   - Execution feasibility

Return ONLY a valid JSON object with this exact structure:
{
  "risk_analysis": {
    "overall_score": 8.5,
    "category_scores": {
      "business_viability": 8.5,
      "market_timing": 7.0,
      "competition_level": 9.0,
      "execution_difficulty": 6.0
    },
    "explanations": {
      "business_viability": "No monetization model, $10K budget insufficient for AI fintech with banking integrations",
      "market_timing": "Market exists but founder hasn't validated specific customer demand yet",
      "competition_level": "Saturated market with Zoho Expense, Razorpay, ClearTax and numerous established players",
      "execution_difficulty": "Can validate core hypothesis with $2K prototype and manual process, then raise funding after proof. Senior engineer skills compensate for limited budget."
    },
    "risk_level": "High",
    "top_risks": [
      {
        "title": "...",
        "severity": 8.5,
        "category": "Competition",
        "why_it_matters": "...",
        "mitigation_steps": ["...", "..."],
        "timeline": "During validation"
      }
    ]
    ${hasDemo ? `,
    "demo_comparison": {
      "has_demo": true,
      "demo_score": ${demoData.score},
      "demo_risk_score": ${demoData.risk_score},
      "score_difference": 0,
      "risk_difference": 0,
      "category_changes": {
        "market_timing": { "demo_score": 6.5, "change": 0 },
        "competition_level": { "demo_score": 7.5, "change": 0 },
        "business_viability": { "demo_score": 7.0, "change": -0.5 },
        "execution_difficulty": { "demo_score": 6.0, "change": -1.5 }
      }
    }` : ''}
  },
  "ai_insights": {
    "recommendation": {
      "verdict": "needs_work",
      "verdict_label": "Very High Risk - Reconsider Approach",
      "confidence": 65,
      "summary": "This idea faces severe challenges including intense competition from well-funded players, insufficient budget for required AI and integration development, and undefined monetization model. Stages 2-8 will help determine if these obstacles can be overcome or if a different approach is needed.",
      "requirements": [
        "Validate willingness-to-pay of ₹200/month with 30+ target customers",
        "Secure $100K-150K funding for full feature set development",
        "Build technical team with AI/ML expertise or secure technical co-founder",
        "Define clear monetization model and validate with target market",
        "Reduce MVP scope to $2-3K using no-code tools or partnerships"
      ],
      "next_steps": [
        "Interview 10 target customers to validate ₹200/month pricing and willingness to pay",
        "Research and contact 3-5 investors or funding sources for $100K-150K seed round",
        "Post job listings or network to hire technical co-founder with AI/ML background",
        "Use customer discovery (Stage 2) to validate if unmet demand exists for core features",
        "Assess product feasibility (Stage 3) with available resources and technical constraints"
      ]
    },
    "score_factors": [
      {
        "factor": "₹10L budget provides adequate runway for MVP development and reduces execution risk compared to underfunded competitors",
        "impact": "positive",
        "category": "Business Viability"
      },
      {
        "factor": "Saturated market with Zoho Expense, Razorpay, ClearTax and numerous established players",
        "impact": "negative",
        "category": "Competition"
      },
      {
        "factor": "Limited technical skills, $10K inadequate for AI development, banking APIs, ERP connections",
        "impact": "negative",
        "category": "Execution"
      }
    ]
  },
  "score": 35,
  "risk_score": 8.5
}

Do not include markdown code blocks, only return the JSON object.
`

  const response = await callAnthropicWithRetry(
    () => anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }]
    }),
    {
      maxRetries: 3,
      initialDelay: 2000,
      operationName: 'Stage 1 Analysis'
    }
  )

  const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '{}'

  // Log raw response for testing
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('[STAGE1] 🧪 TESTING: Raw Claude Response (Stage 1 Analysis)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(responseText)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Parse JSON
  let cleanText = responseText
  if (cleanText.includes('```json')) {
    cleanText = cleanText.replace(/```json\s*/, '').replace(/\s*```$/, '')
  }
  if (cleanText.includes('```')) {
    cleanText = cleanText.replace(/```\s*/, '').replace(/\s*```$/, '')
  }

  const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = {}
  
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0])
      
      // Log parsed JSON for testing
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[STAGE1] 🧪 TESTING: Parsed JSON (Stage 1 Analysis)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(JSON.stringify(parsed, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    } catch (parseError) {
      console.error('[STAGE1] Failed to parse Stage 1 analysis JSON:', parseError)
      // parsed remains {} - will use default values below
    }
  }

  // Validate that AI used correct budget (after parsing analysis)
  if (keyInsights.startupBudget && parsed?.risk_analysis?.explanations) {
    const allText = JSON.stringify(parsed.risk_analysis.explanations) + 
                    JSON.stringify(parsed.ai_insights)
    
    // Check if AI confused market spending with startup budget
    if (keyInsights.marketSpending) {
      const marketNumbers = keyInsights.marketSpending.match(/\$?(\d+)/g) || []
      for (const num of marketNumbers) {
        const amount = parseInt(num.replace(/\D/g, ''), 10)
        // If market spending is small but startup budget is large, check for confusion
        if (amount < 5000 && keyInsights.startupBudget >= 5000) {
          if (allText.includes(`$${amount} budget`) || allText.includes(`\$${amount} budget`)) {
            console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.warn(`⚠️  BUDGET CONFUSION DETECTED`)
            console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.warn(`AI may have used market spending ($${amount}) instead of startup budget ($${keyInsights.startupBudget})`)
            console.warn(`Market spending: ${keyInsights.marketSpending}`)
            console.warn(`Startup budget: $${keyInsights.startupBudget}`)
            console.warn(`This indicates the prompt needs review`)
            console.warn(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
          }
        }
      }
    }
  }

  // Validate and calculate risk score
  const categoryScores = parsed?.risk_analysis?.category_scores || {}
  const calculatedRiskScore = calculateRiskScore({
    competition_level: categoryScores.competition_level || 5.0,
    business_viability: categoryScores.business_viability || 5.0,
    market_timing: categoryScores.market_timing || 5.0,
    execution_difficulty: categoryScores.execution_difficulty || 5.0
  })

  // Update risk analysis with calculated score
  if (parsed?.risk_analysis) {
    parsed.risk_analysis.overall_score = calculatedRiskScore
    
    // Update risk level based on calculated score
    if (calculatedRiskScore <= 3.9) {
      parsed.risk_analysis.risk_level = 'Low'
    } else if (calculatedRiskScore <= 6.9) {
      parsed.risk_analysis.risk_level = 'Medium'
    } else {
      parsed.risk_analysis.risk_level = 'High'
    }
  }

  // Clean up score_factors to ensure proper format
  if (parsed?.ai_insights?.score_factors && Array.isArray(parsed.ai_insights.score_factors)) {
    parsed.ai_insights.score_factors = parsed.ai_insights.score_factors.map((factor: { factor: string; impact: string; category: string }) => ({
      ...factor,
      // Remove any "- Positive -" or "- Negative -" patterns from factor text
      factor: (factor.factor || '')
        .replace(/\s*-\s*(Positive|Negative)\s*-\s*/gi, ' ')
        .replace(/\s*\(Positive\)|\s*\(Negative\)/gi, '')
        .replace(/\s*\[Positive\]|\s*\[Negative\]/gi, '')
        .trim()
    }))
  }

  return {
    risk_analysis: (parsed?.risk_analysis as RiskAnalysis) || {
      overall_score: calculatedRiskScore,
      category_scores: {
        business_viability: 5.0,
        market_timing: 5.0,
        competition_level: 5.0,
        execution_difficulty: 5.0
      },
      explanations: {
        business_viability: 'Analysis pending',
        market_timing: 'Analysis pending',
        competition_level: 'Analysis pending',
        execution_difficulty: 'Analysis pending'
      },
      risk_level: 'Medium' as const,
      top_risks: []
    },
    ai_insights: (parsed?.ai_insights as AIInsights) || {
      recommendation: {
        verdict: 'needs_work' as const,
        verdict_label: 'Analysis Pending',
        confidence: 50,
        summary: 'Analysis in progress',
        requirements: [],
        next_steps: []
      },
      score_factors: []
    },
    score: parsed?.score || 50,
    risk_score: calculatedRiskScore
  }
}

// Generate title from idea text
async function generateTitle(ideaText: string, anthropic: Anthropic): Promise<string> {
  const prompt = `Create a clean, professional title (2-6 words) for this business idea: "${ideaText}"

Rules:
- Keep it 2-6 words maximum
- Use title case
- Be specific and descriptive
- Avoid generic words like "platform", "app", "tool" unless necessary
- Focus on the core value proposition

Return ONLY the title, no quotes, no explanations.`

  try {
    const response = await callAnthropicWithRetry(
      () => anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 20,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      }),
      { operationName: 'Generate Title' }
    )

    const title = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    return title.replace(/^["']|["']$/g, '').trim() || ideaText.substring(0, 50)
  } catch (error) {
    console.warn('[STAGE1] Title generation failed, using fallback:', error)
    return ideaText.substring(0, 50)
  }
}

/**
 * Main function: Generate Stage 1 analysis for an idea
 * 
 * Flow:
 * 1. Fetch idea data (wizard_answers, existing fields, demo data)
 * 2. Generate problem/audience/solution/monetization if NULL
 * 3. Generate Stage 1 analysis (risk + AI insights)
 * 4. Discover competitors (Serper + Claude)
 * 5. Store competitors in database
 * 6. Update idea with Stage 1 data
 */
export async function generateStage1Analysis(
  ideaId: string,
  ideaText: string
): Promise<void> {
  console.log(`[STAGE1] Starting Stage 1 analysis for idea ${ideaId}`)

  // Validate environment variables
  const supabaseServiceKey = getSupabaseServiceKey()
  getAnthropicApiKey() // Validate API key is present

  // Use service role key for background operations (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const anthropic = new Anthropic({ apiKey: getAnthropicApiKey() })

  try {
    // Step 1: Fetch idea data
    const { data: idea, error: fetchError } = await supabase
      .from('ideas')
      .select(
        'id, user_id, idea_text, problem, audience, solution, monetization, wizard_answers, questions, score, risk_score, risk_analysis, title'
      )
      .eq('id', ideaId)
      .single()

    if (fetchError || !idea) {
      throw new Error(`Failed to fetch idea: ${fetchError?.message || 'Not found'}`)
    }

    console.log(`[STAGE1] Fetched idea data for ${ideaId}`)

    // Step 2: Check for demo data
    const hasDemo = !!idea.score && !!idea.risk_score
    const demoData = hasDemo
      ? {
          score: idea.score,
          risk_score: idea.risk_score,
          risk_analysis: idea.risk_analysis
        }
      : null

    // Step 3: Generate problem/audience/solution/monetization from wizard answers
    // Always regenerate from wizard answers if available (even if demo data exists)
    // This ensures consistency with the full analysis context
    let problem = idea.problem
    let audience = idea.audience
    let solution = idea.solution
    let monetization = idea.monetization

    if (idea.wizard_answers && Object.keys(idea.wizard_answers as Record<string, unknown>).length > 0) {
      console.log(`[STAGE1] Generating core fields from wizard answers (regenerating even if demo data exists)`)
      const coreFields = await generateCoreFieldsFromWizard(
        idea.idea_text || ideaText,
        (idea.wizard_answers as Record<string, unknown>) || {},
        anthropic
      )
      // Always use generated values from wizard (overwrites demo data)
      problem = coreFields.problem
      audience = coreFields.audience
      solution = coreFields.solution
      monetization = coreFields.monetization
    } else {
      // Fallback: Only use existing values if no wizard answers available
      console.log(`[STAGE1] No wizard answers available, using existing core fields if present`)
    }

    // Step 4: Discover competitors (Serper + Claude) - BEFORE analysis so we can include them in the prompt
    console.log(`[STAGE1] Discovering competitors`)
    let competitors: AnalyzedCompetitor[] = []

    try {
      const wizardAnswers = (idea.wizard_answers as Record<string, unknown>) || {}

      // Layer 1: Serper search with wizard context
      const searchResults = await searchCompetitorsWithSerper(
        idea.idea_text || ideaText,
        solution || idea.idea_text || ideaText,
        wizardAnswers
      )

      // Layer 2: Claude analysis with wizard context
      if (searchResults.length > 0) {
        competitors = await analyzeCompetitorsWithClaude(
          {
            problem: problem || '',
            audience: audience || '',
            solution: solution || ''
          },
          searchResults,
          wizardAnswers,
          anthropic
        )
      }
    } catch (competitorError) {
      console.error('[STAGE1] Competitor discovery failed:', competitorError)
      // Continue without competitors - don't fail the entire analysis
    }

    // Step 5: Generate Stage 1 analysis (with competitor context)
    console.log(`[STAGE1] Generating Stage 1 analysis with AI`)
    const questions = (idea.questions as Array<{ id: string; text: string }>) || null
    const analysis = await generateStage1AnalysisWithAI(
      idea.idea_text || ideaText,
      problem || '',
      audience || '',
      solution || '',
      monetization || '',
      (idea.wizard_answers as Record<string, unknown>) || {},
      questions,
      demoData,
      competitors, // ← Pass competitors to analysis
      anthropic
    )

    // Step 6: Generate title if NULL
    let title = idea.title
    if (!title) {
      console.log(`[STAGE1] Generating title`)
      title = await generateTitle(idea.idea_text || ideaText, anthropic)
    }

    // Step 7: Store competitors in database
    if (competitors.length > 0 && idea.user_id) {
      console.log(`[STAGE1] Storing ${competitors.length} competitors`)
      
      // Log first competitor for verification
      if (competitors[0]) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[STAGE1] 🧪 TESTING: Sample Competitor Data to be Stored')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(JSON.stringify(competitors[0], null, 2))
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }
      
      // Helper function to enhance price details with helpful context
      function enhancePriceDetails(
        priceTier: 'budget' | 'mid-range' | 'premium' | 'enterprise',
        priceDetails: string
      ): string {
        // If we have real price, keep it
        if (priceDetails && 
            !priceDetails.toLowerCase().includes('not specified') &&
            !priceDetails.toLowerCase().includes('to be determined') &&
            priceDetails.length > 10) {
          return priceDetails
        }
        
        // Otherwise, provide helpful context based on tier
        const tierContext: Record<string, string> = {
          'budget': 'Typically ₹100-500/user/month or freemium',
          'mid-range': 'Typically ₹500-1500/user/month',
          'premium': 'Typically ₹1500-3000/user/month',
          'enterprise': 'Custom pricing - contact for quote'
        }
        
        return tierContext[priceTier] || 'Contact vendor for pricing details'
      }

      const competitorInserts = competitors.map(competitor => {
        // Enhance price details if needed
        let enhancedPriceDetails = competitor.positioning?.price_details || ''
        if (competitor.positioning) {
          enhancedPriceDetails = enhancePriceDetails(
            competitor.positioning.price_tier,
            competitor.positioning.price_details
          )
        }

        // Store positioning as structured JSONB (new approach)
        // Keep description as fallback for backward compatibility
        let description: string | null = null
        let positioningJson: Record<string, unknown> | null = null
        
        if (competitor.positioning) {
          const pos = competitor.positioning
          
          // Store structured positioning as JSONB
          positioningJson = {
            target_market: pos.target_market || null,
            price_tier: pos.price_tier || null,
            price_details: enhancedPriceDetails || null,
            key_strengths: pos.key_strengths || null,
            company_stage: pos.company_stage || null,
            geographic_focus: pos.geographic_focus || null
          }
          
          // Also store formatted text in description for backward compatibility
          const geographicInfo = pos.geographic_focus ? ` Geographic focus: ${pos.geographic_focus}.` : ''
          const stageInfo = pos.company_stage && pos.company_stage !== 'unknown' ? ` Company stage: ${pos.company_stage}.` : ''
          description = `${pos.target_market}.${geographicInfo}${stageInfo} ${pos.price_tier} pricing: ${enhancedPriceDetails}. ${pos.key_strengths}`
        } else if (competitor.our_differentiation) {
          description = competitor.our_differentiation
        }

        // Extract pricing info from positioning for database fields
        let pricingModel: string | null = null
        let pricingAmount: number | null = null
        
        if (competitor.positioning) {
          // Map price_tier to pricing_model
          const tierMap: Record<string, string> = {
            'budget': 'freemium',
            'mid-range': 'subscription',
            'premium': 'subscription',
            'enterprise': 'enterprise'
          }
          pricingModel = tierMap[competitor.positioning.price_tier] || 'subscription'
          
          // Try to extract numeric price from enhanced price details
          const priceMatch = enhancedPriceDetails.match(/₹?(\d+)/) || enhancedPriceDetails.match(/\$?(\d+)/)
          if (priceMatch) {
            pricingAmount = parseInt(priceMatch[1], 10)
          }
        }

        return {
          idea_id: ideaId,
          user_id: idea.user_id,
          name: competitor.name,
          website: competitor.website || null,
          description: description, // Keep for backward compatibility
          positioning: positioningJson, // NEW: Store structured positioning as JSONB
          pricing_model: pricingModel,
          pricing_amount: pricingAmount,
          key_features: competitor.key_features || [],
          our_differentiation: competitor.our_differentiation || null,
          threat_level: competitor.threat_level,
          data_source: competitor.website ? 'web_search' : 'ai_generated',
          confidence_score: competitor.website ? 8 : 5,
          is_direct_competitor: competitor.relevance === 'direct'
        }
      })

      // Log first insert object for verification
      if (competitorInserts[0]) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[STAGE1] 🧪 TESTING: Sample Database Insert Object')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(JSON.stringify(competitorInserts[0], null, 2))
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }

      const { data: insertedData, error: competitorError } = await supabase
        .from('competitors')
        .insert(competitorInserts)
        .select()

      if (competitorError) {
        console.error('[STAGE1] Failed to insert competitors:', competitorError)
        // Don't fail the entire analysis if competitor insert fails
      } else if (insertedData && insertedData.length > 0) {
        console.log(`[STAGE1] ✅ Successfully inserted ${insertedData.length} competitors`)
        
        // Log first inserted row for verification
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('[STAGE1] 🧪 TESTING: Sample Database Row (After Insert)')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(JSON.stringify(insertedData[0], null, 2))
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      }
    }

    // Step 8: Update idea with Stage 1 data
    console.log(`[STAGE1] Updating idea with Stage 1 data`)
    
    // Log what we're about to store
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[STAGE1] 🧪 TESTING: Stage 1 Analysis Data to be Stored')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(JSON.stringify({
      score: analysis.score,
      risk_score: analysis.risk_score,
      risk_analysis: analysis.risk_analysis,
      ai_insights: analysis.ai_insights,
      problem,
      audience,
      solution,
      monetization,
      title
    }, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    const { error: updateError } = await supabase
      .from('ideas')
      .update({
        problem: problem || null,
        audience: audience || null,
        solution: solution || null,
        monetization: monetization || null,
        title: title || null,
        score: analysis.score,
        risk_score: analysis.risk_score,
        risk_analysis: analysis.risk_analysis,
        ai_insights: analysis.ai_insights,
        status: 'complete'
      })
      .eq('id', ideaId)

    if (updateError) {
      throw new Error(`Failed to update idea: ${updateError.message}`)
    }

    // Log completion metrics
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[STAGE1] 📊 COMPLETION METRICS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Score: ${analysis.score}/100`)
    console.log(`Risk Score: ${analysis.risk_score}/10 (${analysis.risk_analysis.risk_level})`)
    console.log(`Competitors Found: ${competitors.length}`)
    console.log(`Direct Threats: ${competitors.filter(c => c.relevance === 'direct').length}`)
    console.log(`Analysis Quality: ${competitors.length > 0 ? 'Complete' : 'No competitors found'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log(`[STAGE1] ✅ Successfully completed Stage 1 analysis for idea ${ideaId}`)
  } catch (error) {
    console.error(`[STAGE1] Error for idea ${ideaId}:`, error)

    // Update idea status to indicate failure
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await supabase
        .from('ideas')
        .update({
          status: 'stage1_failed',
          error_message: errorMessage,
          error_occurred_at: new Date().toISOString()
        })
        .eq('id', ideaId)

      console.log(`[STAGE1] Updated idea ${ideaId} status to stage1_failed`)
    } catch (updateError) {
      console.error('[STAGE1] Failed to update error status:', updateError)
    }

    // Re-throw so caller knows it failed
    throw error
  }
}

