# Maximum Accuracy Competitor Discovery Approach

## Overview

For maximum accuracy, use **all 5 layers with cross-validation**. This approach prioritizes accuracy over cost/speed.

---

## Strategy: Multi-Source Cross-Validation

### Core Principle
**If a competitor is found in 2+ independent sources, it's highly likely to be accurate.**

### Accuracy Layers (All Required)

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Claude Generation                              │
│ → Generate 10-12 competitors from AI knowledge          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Aggregator Sites (Parallel)                    │
│ → Scrape AlternativeTo, G2, Capterra                    │
│ → Find 5-8 additional competitors                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Merge & Deduplicate                                     │
│ → Combine AI + Aggregator results                       │
│ → Group by similar names                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Web Search Validation                         │
│ → Validate ALL competitors via search                   │
│ → Prove they exist + get real URLs                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Cross-Reference                                         │
│ → If found in 2+ sources → confidence_score = 8        │
│ → If found in 1 source → confidence_score = 5          │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Smart Scraping                                 │
│ → Scrape features/positioning from validated websites   │
│ → Extract real data (skip pricing)                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Semantic Analysis                              │
│ → Filter false positives                                │
│ → Rank by relevance                                     │
│ → Calculate final confidence scores                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Return Top 3-5 Most Accurate Competitors                │
│ → Highest confidence_score                             │
│ → Validated + Cross-referenced + Enriched               │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation

### Complete Flow

```typescript
async function discoverCompetitorsWithMaximumAccuracy(ideaContext: {
  idea_text: string
  problem: string
  audience: string
  solution: string
  monetization: string
  wizard_answers: Record<string, unknown>
}): Promise<Competitor[]> {
  
  // ============================================
  // Phase 1: Generate from Multiple Sources (Parallel)
  // ============================================
  const [aiCompetitors, aggregatorCompetitors] = await Promise.all([
    // Layer 1: Claude generates 10-12 competitors
    generateCompetitorsWithClaude(ideaContext),
    
    // Layer 3: Aggregator sites find 5-8 competitors
    scrapeAggregatorSites(ideaContext.category)
  ])
  
  // ============================================
  // Phase 2: Merge and Deduplicate
  // ============================================
  const merged = mergeAndDeduplicateCompetitors([
    ...aiCompetitors,
    ...aggregatorCompetitors
  ])
  
  // ============================================
  // Phase 3: Validate ALL via Web Search (Layer 2)
  // ============================================
  const validated = await Promise.all(
    merged.map(async (competitor) => {
      const validation = await validateCompetitorViaSearch(
        competitor.name,
        competitor.category
      )
      
      return {
        ...competitor,
        website: validation.website,
        exists: validation.exists,
        found_in_search: validation.exists,
        source: competitor.source || 'unknown' // Track original source
      }
    })
  )
  
  // ============================================
  // Phase 4: Cross-Reference
  // ============================================
  const crossReferenced = crossReferenceCompetitors(validated)
  
  // ============================================
  // Phase 5: Filter to Only Validated (Have Real Websites)
  // ============================================
  const withWebsites = crossReferenced.filter(c => c.website && c.exists)
  
  // ============================================
  // Phase 6: Scrape Features/Positioning (Layer 4)
  // ============================================
  const enriched = await Promise.all(
    withWebsites.map(async (competitor) => {
      try {
        const scrapedData = await scrapeCompetitorWebsite(competitor.website!)
        return {
          ...competitor,
          ...scrapedData,
          data_source: 'web_search',
          features_scraped: true,
          pricing_found: !!scrapedData.pricing_amount
        }
      } catch (error) {
        // Keep competitor even if scraping fails
        return {
          ...competitor,
          data_source: 'validated_ai',
          features_scraped: false,
          pricing_found: false
        }
      }
    })
  )
  
  // ============================================
  // Phase 7: Semantic Analysis (Layer 5)
  // ============================================
  const semanticallyFiltered = await analyzeCompetitorsWithClaude(
    {
      problem: ideaContext.problem,
      audience: ideaContext.audience,
      solution: ideaContext.solution
    },
    enriched,
    ideaContext.wizard_answers
  )
  
  // ============================================
  // Phase 8: Calculate Final Confidence Scores
  // ============================================
  const scored = semanticallyFiltered.map(competitor => ({
    ...competitor,
    confidence_score: calculateConfidenceScore(competitor),
    accuracy_indicators: {
      found_in_multiple_sources: competitor.found_in_sources?.length >= 2,
      has_real_website: !!competitor.website,
      features_scraped: competitor.features_scraped,
      high_relevance: competitor.relevance_score >= 0.7,
      cross_validated: competitor.cross_validated
    }
  }))
  
  // ============================================
  // Phase 9: Return Top 3-5 Most Accurate
  // ============================================
  return scored
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 5)
}
```

---

## Cross-Reference Logic

```typescript
interface CompetitorCandidate {
  name: string
  category: string
  source: 'ai' | 'aggregator' | 'search'
  website?: string
  exists?: boolean
}

function crossReferenceCompetitors(
  competitors: CompetitorCandidate[]
): CompetitorCandidate[] {
  // Group by similar name (fuzzy match)
  const grouped = groupBySimilarName(competitors)
  
  return grouped.map(group => {
    const sources = group.items.map(item => item.source)
    const uniqueSources = [...new Set(sources)]
    
    return {
      ...group.primary,
      found_in_sources: uniqueSources,
      cross_validated: uniqueSources.length >= 2,
      confidence_score: uniqueSources.length >= 2 ? 8 : 5
    }
  })
}

function groupBySimilarName(competitors: CompetitorCandidate[]) {
  const groups: Array<{
    primary: CompetitorCandidate
    items: CompetitorCandidate[]
  }> = []
  
  for (const competitor of competitors) {
    // Find existing group with similar name
    const existingGroup = groups.find(group =>
      isSimilarName(group.primary.name, competitor.name)
    )
    
    if (existingGroup) {
      existingGroup.items.push(competitor)
    } else {
      groups.push({
        primary: competitor,
        items: [competitor]
      })
    }
  }
  
  return groups
}

function isSimilarName(name1: string, name2: string): boolean {
  // Normalize names
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const n1 = normalize(name1)
  const n2 = normalize(name2)
  
  // Check exact match
  if (n1 === n2) return true
  
  // Check if one contains the other (e.g., "Stripe" vs "Stripe Payments")
  if (n1.includes(n2) || n2.includes(n1)) return true
  
  // Check Levenshtein distance (fuzzy match)
  const distance = levenshteinDistance(n1, n2)
  const maxLength = Math.max(n1.length, n2.length)
  const similarity = 1 - (distance / maxLength)
  
  return similarity >= 0.8 // 80% similarity threshold
}
```

---

## Confidence Score Calculation

```typescript
function calculateConfidenceScore(competitor: Competitor): number {
  let score = 5 // Base score
  
  // +2 if found in multiple sources (cross-validated)
  if (competitor.found_in_sources?.length >= 2) {
    score += 2
  }
  
  // +2 if has real website (validated via search)
  if (competitor.website) {
    score += 2
  }
  
  // +1 if features were scraped (real data)
  if (competitor.features_scraped) {
    score += 1
  }
  
  // +1 if high relevance from semantic analysis
  if (competitor.relevance_score >= 0.7) {
    score += 1
  }
  
  // +1 if direct competitor (not indirect)
  if (competitor.is_direct_competitor) {
    score += 1
  }
  
  // Cap at 10
  return Math.min(10, score)
}
```

---

## Accuracy Indicators

### High Accuracy (Confidence Score 8-10)
- ✅ Found in 2+ independent sources (AI + Aggregator)
- ✅ Validated via web search (real website exists)
- ✅ Features scraped from actual website
- ✅ Semantic analysis confirms high relevance
- ✅ Direct competitor (not indirect)

### Medium Accuracy (Confidence Score 5-7)
- ⚠️ Found in 1 source only
- ⚠️ Validated via web search
- ⚠️ Features not scraped (AI-generated only)
- ⚠️ Medium relevance from semantic analysis

### Low Accuracy (Confidence Score 1-4)
- ❌ Not validated via web search
- ❌ No website found
- ❌ Low relevance from semantic analysis
- ❌ Indirect competitor or false positive

---

## Cost & Performance

### Per Idea Analysis:

| Layer | Cost | Time | Accuracy Impact |
|-------|------|------|-----------------|
| Layer 1: Claude | Free | 5s | Medium |
| Layer 2: Web Search | ~$0.15 | 10s | High |
| Layer 3: Aggregator | Free | 15s | High |
| Layer 4: Scraping | ~$0.05 | 20s | Medium |
| Layer 5: Semantic | Free | 5s | High |
| **Total** | **~$0.20** | **~55s** | **Maximum** |

**Trade-offs:**
- ⚠️ Higher cost (~$0.20 vs ~$0.10)
- ⚠️ Slower (55s vs 15s)
- ✅ Maximum accuracy (cross-validated, enriched)

---

## Database Storage

```typescript
await supabase.from('competitors').insert({
  idea_id: ideaId,
  user_id: userId,
  name: competitor.name,
  website: competitor.website,
  description: competitor.description,
  
  // Pricing (often null - OK)
  pricing_model: competitor.pricing_model || null,
  pricing_amount: competitor.pricing_amount || null,
  
  // Features (usually available)
  key_features: competitor.key_features || [],
  
  // Analysis
  our_differentiation: competitor.our_differentiation,
  threat_level: competitor.threat_level,
  
  // Metadata (tracks accuracy)
  data_source: competitor.data_source, // 'web_search' | 'validated_ai'
  confidence_score: competitor.confidence_score, // 1-10
  is_direct_competitor: competitor.is_direct_competitor,
  
  // Additional accuracy tracking
  found_in_sources: competitor.found_in_sources, // ['ai', 'aggregator']
  cross_validated: competitor.cross_validated, // true/false
  features_scraped: competitor.features_scraped // true/false
})
```

---

## Error Handling

```typescript
// Graceful degradation for each layer:

try {
  const aiCompetitors = await generateCompetitorsWithClaude(...)
} catch (error) {
  // Fallback: Use basic competitor list from Stage 1 analysis
  console.warn('Layer 1 failed, using fallback')
}

try {
  const validated = await validateCompetitorViaSearch(...)
} catch (error) {
  // Continue without validation (mark as unvalidated)
  console.warn('Layer 2 failed, continuing without validation')
}

try {
  const aggregatorCompetitors = await scrapeAggregatorSites(...)
} catch (error) {
  // Continue without aggregator data
  console.warn('Layer 3 failed, skipping aggregator sites')
}

try {
  const scrapedData = await scrapeCompetitorWebsite(...)
} catch (error) {
  // Use AI-generated data only
  console.warn('Layer 4 failed, using AI data only')
}

try {
  const filtered = await analyzeCompetitorsWithClaude(...)
} catch (error) {
  // Use basic analysis without semantic filtering
  console.warn('Layer 5 failed, using basic analysis')
}
```

---

## Summary

**For Maximum Accuracy:**
- ✅ Use all 5 layers
- ✅ Cross-validate (2+ sources = higher confidence)
- ✅ Web search validates existence
- ✅ Scrape real data from websites
- ✅ Semantic analysis filters false positives
- ✅ Confidence scoring tracks accuracy

**Result:** Top 3-5 competitors with confidence scores 8-10, cross-validated, enriched with real data.

