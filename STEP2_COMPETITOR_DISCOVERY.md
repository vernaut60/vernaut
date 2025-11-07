# Step 2: generateStage1Analysis() - Multi-Layer Competitor Discovery

## Overview

Implements a 5-layer competitor discovery strategy that combines AI knowledge, web validation, aggregator sites, smart scraping, and semantic analysis.

---

## Layer Architecture

### Layer 1: Claude's Knowledge (Free)
**Purpose:** Generate initial competitor list from Claude's training data

**Implementation:**
```typescript
// Ask Claude to list likely competitors based on idea
const aiCompetitors = await claude.generateCompetitors({
  idea_text,
  problem,
  audience,
  solution,
  monetization,
  wizard_answers
})

// Returns:
// - Array of competitor names
// - Basic categorization
// - Estimated market position
```

**Pros:**
- ✅ Free (using existing Claude API)
- ✅ Fast
- ✅ Good for well-known companies

**Cons:**
- ❌ Weak for niche/new markets
- ❌ May include hallucinations
- ❌ Limited to training data cutoff

---

### Layer 2: Web Search Validation (Cheap - ~$0.01/search)
**Purpose:** Validate Claude's suggestions exist and find additional competitors

**Implementation:**
```typescript
// For each AI-generated competitor:
const validated = await validateCompetitor(competitorName, category)

// Search queries:
// 1. "[competitor name] official website"
// 2. "[idea description] alternatives"
// 3. "[solution type] competitors"

// Returns:
// - Real website URLs (not hallucinations)
// - Additional competitors found via search
// - Validation status (exists/not found)
```

**Tools:**
- Google Custom Search API (free tier: 100 searches/day)
- SerpAPI ($50/month for 5K searches)
- ScraperAPI (for scraping search results)

**Pros:**
- ✅ Validates real companies exist
- ✅ Finds additional competitors
- ✅ Gets real URLs

**Cons:**
- ⚠️ Small cost per search (~$0.01)
- ⚠️ Rate limits on free tiers

---

### Layer 3: Aggregator Sites (Free Scraping)
**Purpose:** Leverage existing competitor lists on aggregator sites

**Implementation:**
```typescript
// Scrape aggregator sites:
const aggregatorCompetitors = await Promise.all([
  scrapeAlternativeTo(category),
  scrapeG2(category),
  scrapeCapterra(category)
])

// These sites already list competitors by category
// Extract:
// - Competitor names
// - Brief descriptions
// - Links to websites
// - User ratings (if available)
```

**Sites to Scrape:**
1. **AlternativeTo.net**
   - URL pattern: `https://alternativeto.net/software/[category]/`
   - Free to scrape (robots.txt allows)
   - User-submitted alternatives

2. **G2.com**
   - URL pattern: `https://www.g2.com/categories/[category]`
   - Business software reviews
   - Rich competitor data

3. **Capterra**
   - URL pattern: `https://www.capterra.com/categories/[category]`
   - Software marketplace
   - Detailed competitor listings

**Pros:**
- ✅ Free (no API costs)
- ✅ Pre-organized by category
- ✅ User-validated data

**Cons:**
- ⚠️ Requires web scraping (respect robots.txt)
- ⚠️ May need proxy rotation for rate limits

---

### Layer 4: Smart Scraping (Cheap)
**Purpose:** Extract features, positioning, and company info from validated competitor websites

**Implementation:**
```typescript
// For each validated competitor:
const competitorData = await scrapeCompetitorWebsite(websiteUrl)

// Extract (what's actually available):
// - Features page (key_features array) ✅ Usually public
// - About page (description, founded_date, team_size) ✅ Usually public
// - Logo URL ✅ Usually public
// - Real positioning statements ✅ Usually public
// - Pricing page ⚠️ Often hidden/behind forms (make optional)
```

**Scraping Strategy:**
```typescript
// Prioritize what's actually accessible:
1. Features page (/features, /solutions) - Usually public ✅
2. About page (/about, /company) - Usually public ✅
3. Homepage - Extract positioning/value prop ✅
4. Pricing page (/pricing, /plans) - Often hidden ⚠️
   - Try to find, but don't fail if not available
   - Many B2B companies hide pricing
   - Enterprise = "Contact for pricing"

// If pricing not found:
- Use AI to estimate based on features/category
- Mark as "estimated" with confidence score
- Store as null and indicate "pricing not available"

// Tools:
- ScraperAPI ($50/month for 10K requests)
- Puppeteer/Playwright (for JS-heavy sites)
- Structured data parsers
```

**Pros:**
- ✅ Features and positioning are usually public
- ✅ Company info is usually accessible
- ✅ Can extract valuable competitive insights

**Cons:**
- ⚠️ Pricing is often hidden/not available
- ⚠️ Some sites block scrapers
- ⚠️ Websites change structure
- ⚠️ Many B2B companies use "Contact for pricing"

---

### Layer 5: Semantic Analysis (Free with Claude)
**Purpose:** Filter false positives, identify positioning gaps, determine relevance

**Implementation:**
```typescript
// Feed all discovered competitors to Claude:
const analyzedCompetitors = await claude.analyzeCompetitors({
  idea_context: { problem, audience, solution },
  discovered_competitors: allCompetitors, // From Layers 1-4
  wizard_answers
})

// Claude determines:
// - Actual relevance (direct/indirect/none)
// - Positioning gaps (where competitors are weak)
// - Competitive advantages
// - Threat level
// - Our differentiation
```

**Analysis Includes:**
- Filter out false positives
- Rank by actual relevance
- Identify positioning gaps
- Determine competitive advantage
- Calculate threat level (1-10)

**Pros:**
- ✅ Free (using Claude)
- ✅ Context-aware analysis
- ✅ Identifies opportunities

**Cons:**
- ⚠️ Requires all data to be collected first

---

## Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Fetch Idea Data                                      │
│ - idea_text, wizard_answers, problem, audience, solution      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Check for Demo Data                                 │
│ - score, risk_score, risk_analysis                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Generate problem/audience/solution/monetization     │
│ (if NULL - from wizard_answers)                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Generate Stage 1 Analysis (Risk + AI Insights)     │
│ - Risk analysis with demo comparison                        │
│ - AI insights (recommendation + score factors)             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Claude Generates Competitor List (Free)           │
│ - 5-10 competitor names from Claude's knowledge             │
│ - Basic categorization                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Web Search Validation (Cheap)                     │
│ - Validate each competitor exists                           │
│ - Find additional via "[idea] alternatives" search         │
│ - Get real URLs                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Aggregator Sites (Free)                            │
│ - Scrape AlternativeTo.net                                  │
│ - Scrape G2.com                                             │
│ - Scrape Capterra                                           │
│ - Merge results (deduplicate)                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Smart Scraping (Cheap)                            │
│ - For each validated competitor:                           │
│   - Scrape pricing page                                     │
│   - Scrape features page                                    │
│   - Extract company info                                    │
│   - Get logo URL                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Semantic Analysis (Free)                          │
│ - Feed all competitors to Claude                            │
│ - Filter false positives                                    │
│ - Rank by relevance                                         │
│ - Identify positioning gaps                                 │
│ - Determine threat level                                     │
│ - Calculate our differentiation                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Store Enriched Competitors                          │
│ - Insert into competitors table                            │
│ - data_source: 'web_search' (if scraped)                  │
│ - confidence_score: based on layers used                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Update Ideas Table                                  │
│ - status: 'complete'                                        │
│ - score, risk_score                                         │
│ - risk_analysis, ai_insights                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Layer 1: Claude Competitor Generation

```typescript
async function generateCompetitorsWithClaude(
  ideaText: string,
  problem: string,
  audience: string,
  solution: string,
  wizardAnswers: Record<string, unknown>
): Promise<CompetitorCandidate[]> {
  const prompt = `
You are analyzing a startup idea and need to identify likely competitors.

Idea Context:
- Problem: ${problem}
- Audience: ${audience}
- Solution: ${solution}
- Additional Context: ${JSON.stringify(wizardAnswers)}

Based on this idea, list 5-10 likely competitors. For each competitor, provide:
- Company name (real companies, not fictional)
- Category they operate in
- Brief description of what they do
- Estimated market position (leader/challenger/niche)

Return JSON array:
[
  {
    "name": "Company Name",
    "category": "Category",
    "description": "What they do",
    "market_position": "leader" | "challenger" | "niche"
  }
]
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  })

  // Parse and return
}
```

---

### Layer 2: Web Search Validation

```typescript
async function validateCompetitorViaSearch(
  competitorName: string,
  category: string
): Promise<{
  exists: boolean
  website?: string
  additionalCompetitors?: string[]
}> {
  // Use Google Custom Search API or SerpAPI
  const searchQuery = `${competitorName} ${category} official website`
  
  const searchResults = await googleSearchAPI.search(searchQuery)
  
  // Extract first result URL
  const website = searchResults.items[0]?.link
  
  // Also search for "[idea] alternatives"
  const alternativesQuery = `[${category}] alternatives`
  const alternativesResults = await googleSearchAPI.search(alternativesQuery)
  
  return {
    exists: !!website,
    website,
    additionalCompetitors: extractCompetitorNames(alternativesResults)
  }
}
```

---

### Layer 3: Aggregator Site Scraping

```typescript
async function scrapeAggregatorSites(category: string): Promise<CompetitorCandidate[]> {
  const [alternativeTo, g2, capterra] = await Promise.all([
    scrapeAlternativeTo(category),
    scrapeG2(category),
    scrapeCapterra(category)
  ])
  
  // Merge and deduplicate by name
  return mergeAndDeduplicate([alternativeTo, g2, capterra])
}

async function scrapeAlternativeTo(category: string): Promise<CompetitorCandidate[]> {
  const url = `https://alternativeto.net/software/${slugify(category)}/`
  
  // Use ScraperAPI or Puppeteer
  const html = await scrapePage(url)
  
  // Parse HTML to extract:
  // - Competitor names (from <h3> tags)
  // - Descriptions
  // - Links to websites
  
  return parsedCompetitors
}
```

---

### Layer 4: Smart Website Scraping

```typescript
async function scrapeCompetitorWebsite(websiteUrl: string): Promise<CompetitorData> {
  // Scrape features page (usually public)
  const featuresData = await scrapeFeaturesPage(websiteUrl).catch(() => null)
  
  // Scrape about page (usually public)
  const aboutData = await scrapeAboutPage(websiteUrl).catch(() => null)
  
  // Try to scrape pricing (often hidden/not available)
  let pricingData = null
  let pricingFound = false
  try {
    pricingData = await scrapePricingPage(websiteUrl)
    pricingFound = true
  } catch (error) {
    // Pricing not available - this is common
    console.log(`Pricing not found for ${websiteUrl}`)
  }
  
  // If pricing not found, use AI to estimate
  let estimatedPricing = null
  if (!pricingFound && featuresData) {
    estimatedPricing = await estimatePricingWithAI({
      features: featuresData.features,
      category: featuresData.category,
      website: websiteUrl
    })
  }
  
  return {
    pricing_model: pricingData 
      ? extractPricingModel(pricingData)
      : estimatedPricing?.model || null,
    pricing_amount: pricingData
      ? extractPricingAmount(pricingData)
      : estimatedPricing?.amount || null,
    pricing_confidence: pricingFound ? 'high' : estimatedPricing ? 'low' : 'none',
    pricing_source: pricingFound ? 'scraped' : estimatedPricing ? 'ai_estimated' : null,
    key_features: extractFeatures(featuresData) || [],
    description: aboutData?.description || null,
    founded_date: aboutData?.foundedDate || null,
    team_size: aboutData?.teamSize || null,
    logo_url: extractLogoUrl(websiteUrl)
  }
}

// AI estimates pricing when not available
async function estimatePricingWithAI(context: {
  features: string[]
  category: string
  website: string
}): Promise<{ model: string; amount: number | null }> {
  // Use Claude to estimate pricing based on:
  // - Features offered
  // - Category (B2B SaaS, B2C app, etc.)
  // - Website quality/complexity
  
  // Returns estimated pricing model and amount
  // Marked as "low confidence" in database
}
```

---

### Layer 5: Semantic Analysis

```typescript
async function analyzeCompetitorsWithClaude(
  ideaContext: {
    problem: string
    audience: string
    solution: string
  },
  discoveredCompetitors: CompetitorCandidate[],
  wizardAnswers: Record<string, unknown>
): Promise<AnalyzedCompetitor[]> {
  const prompt = `
You are analyzing competitors for this startup idea:

Problem: ${ideaContext.problem}
Audience: ${ideaContext.audience}
Solution: ${ideaContext.solution}

Discovered Competitors:
${JSON.stringify(discoveredCompetitors, null, 2)}

For each competitor, determine:
1. Relevance: "direct" | "indirect" | "none"
2. Threat Level: 1-10 (10 = highest threat)
3. Our Differentiation: How we're different/better
4. Positioning Gap: Where they're weak
5. Keep: true/false (filter false positives)

Return JSON array with analyzed competitors.
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  })

  // Parse and filter (keep only relevant competitors)
  return parsedAnalysis.filter(c => c.keep && c.relevance !== 'none')
}
```

---

## Cost Estimates

### Per Idea Analysis:

| Layer | Cost | Notes |
|-------|------|-------|
| Layer 1: Claude | Free | Using existing API |
| Layer 2: Web Search | ~$0.10 | 10 searches × $0.01 |
| Layer 3: Aggregator | Free | Public scraping |
| Layer 4: Smart Scraping | ~$0.03 | 5 competitors × $0.006 (features/about only) |
| Layer 5: Claude Analysis | Free | Using existing API |
| **Total** | **~$0.13 per idea** | Very affordable |

**Note:** Pricing scraping is optional and often fails (many companies hide pricing). Focus on features, positioning, and company info which are usually public.

---

## Error Handling

```typescript
// For each layer, implement graceful degradation:

try {
  const layer1Results = await generateCompetitorsWithClaude(...)
} catch (error) {
  // Fallback: Use basic competitor list from Stage 1 analysis
  console.warn('Layer 1 failed, using fallback')
}

try {
  const layer2Results = await validateCompetitorViaSearch(...)
} catch (error) {
  // Continue without validation (mark as unvalidated)
  console.warn('Layer 2 failed, continuing without validation')
}

try {
  const layer3Results = await scrapeAggregatorSites(...)
} catch (error) {
  // Continue without aggregator data
  console.warn('Layer 3 failed, skipping aggregator sites')
}

try {
  const layer4Results = await scrapeCompetitorWebsite(...)
} catch (error) {
  // Use AI-generated data only
  console.warn('Layer 4 failed, using AI data only')
}

try {
  const layer5Results = await analyzeCompetitorsWithClaude(...)
} catch (error) {
  // Use basic analysis without semantic filtering
  console.warn('Layer 5 failed, using basic analysis')
}
```

---

## Database Storage

```typescript
// Store enriched competitor:
await supabase.from('competitors').insert({
  idea_id: ideaId,
  user_id: userId,
  name: competitor.name,
  website: competitor.website || null,
  description: competitor.description,
  
  // Pricing (often null - many companies hide pricing)
  pricing_model: competitor.pricing_model || null,
  pricing_amount: competitor.pricing_amount || null,
  // Note: If pricing is null, that's OK - many B2B companies use "Contact for pricing"
  
  // Features (usually available)
  key_features: competitor.key_features || [],
  
  // Funding (optional - may not be available)
  funding_amount: competitor.funding_amount || null,
  funding_stage: competitor.funding_stage || null,
  
  // Analysis
  our_differentiation: competitor.our_differentiation,
  threat_level: competitor.threat_level,
  
  // Metadata
  data_source: competitor.website ? 'web_search' : 'ai_generated',
  confidence_score: calculateConfidenceScore(competitor), // Based on layers used
  is_direct_competitor: competitor.relevance === 'direct'
})

// Note: pricing_model and pricing_amount can be NULL
// - Many B2B companies hide pricing
// - Enterprise = "Contact for pricing"
// - Focus on features/positioning instead
```

---

## Implementation Checklist

- [ ] Layer 1: Claude competitor generation
- [ ] Layer 2: Web search validation (Google Custom Search/SerpAPI)
- [ ] Layer 3: Aggregator site scraping (AlternativeTo, G2, Capterra)
- [ ] Layer 4: Smart website scraping (pricing, features, about)
- [ ] Layer 5: Semantic analysis with Claude
- [ ] Error handling for each layer
- [ ] Deduplication logic (merge competitors from all layers)
- [ ] Confidence scoring (based on layers used)
- [ ] Database storage (competitors table)
- [ ] Logging and monitoring

---

## Next Steps

1. **Choose scraping tools:**
   - Google Custom Search API (free tier)
   - SerpAPI (for production)
   - ScraperAPI (for website scraping)

2. **Implement Layer 1** (Claude generation) - simplest, start here

3. **Implement Layer 2** (Web search validation) - validates Layer 1

4. **Implement Layer 3** (Aggregator sites) - adds more competitors

5. **Implement Layer 4** (Smart scraping) - enriches data

6. **Implement Layer 5** (Semantic analysis) - filters and ranks

---

## Questions

1. **Scraping tools:** Which APIs to use? (Google Custom Search, SerpAPI, ScraperAPI)
2. **Rate limits:** How to handle rate limits gracefully?
3. **Caching:** Should we cache aggregator site results?
4. **Priority:** Which layer to implement first? (Recommend: Layer 1 → Layer 2 → Layer 5, then 3 & 4)

