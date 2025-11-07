# Database Schema Recommendation: Readable & Normalized

## Current State Analysis

### ✅ What's Already Normalized (Good!)
- `competitors` table exists - **USE THIS** instead of JSONB
- Simple fields as columns (`title`, `problem`, `audience`, `solution`, `monetization`)
- Scores as columns (`score`, `risk_score`)

### ⚠️ What's in JSONB (Needs Review)

**JSONB is good for:**
- Complex nested structures that don't need individual queries
- Data that changes structure frequently
- Arrays/objects that are always accessed together

**JSONB is bad for:**
- Data you need to query/filter on
- Data you want to read directly in SQL
- Data that should be normalized

---

## Best Practice Recommendation

### ✅ Use Normalized Tables (Readable)

#### 1. Competitors → Use `competitors` Table
**Don't store in JSONB!**

**Current Schema (Perfect!):**
```sql
competitors (
  id UUID,
  idea_id UUID REFERENCES ideas(id),
  name TEXT,
  website TEXT,
  pricing_model TEXT,
  pricing_amount NUMERIC,
  key_features JSONB,  -- OK: array of features
  our_differentiation TEXT,
  threat_level INTEGER,
  market_position TEXT,  -- "leader" | "challenger" | "niche"
  ...
)
```

**Benefits:**
- ✅ Easy to query: `SELECT * FROM competitors WHERE idea_id = ?`
- ✅ Easy to filter: `WHERE threat_level > 7`
- ✅ Easy to read in SQL client
- ✅ Can add indexes for performance
- ✅ Can JOIN with ideas table

**Store in `competitors` table:**
- Individual competitor records (one row per competitor)
- All competitor details (name, website, pricing, features, etc.)

**Store in `ideas.risk_analysis` JSONB (summary only):**
```json
{
  "competitor_analysis": {
    "count": 5,
    "categories": ["Agricultural Technology", "Farm Management Software"]
  }
}
```

---

#### 2. Risk Analysis → Keep JSONB (Complex Nested Structure)

**Why JSONB is OK here:**
- Risk scores, explanations, top_risks are always accessed together
- Complex nested structure (category_scores, explanations, top_risks)
- Doesn't need individual queries

**Structure:**
```json
{
  "overall_score": 6.5,
  "category_scores": {
    "business_viability": 7.0,
    "market_timing": 6.5,
    "competition_level": 7.5,
    "execution_difficulty": 6.0
  },
  "explanations": {
    "business_viability": "...",
    "market_timing": "...",
    "competition_level": "...",
    "execution_difficulty": "..."
  },
  "risk_level": "Medium",
  "top_risks": [
    {
      "title": "...",
      "severity": 7.5,
      "category": "Competition",
      "why_it_matters": "...",
      "mitigation_steps": ["...", "..."],
      "timeline": "Month 1-2",
      "likelihood": "High",
      "description": "...",
      "mitigation": "..."
    }
  ],
  "demo_comparison": {
    "has_demo": true,
    "demo_score": 85,
    "demo_risk_score": 6.9,
    "score_difference": 2,
    "risk_difference": -0.4,
    "category_changes": {...}
  }
}
```

---

#### 3. AI Insights → Keep JSONB (Complex Nested Structure)

**Why JSONB is OK here:**
- Recommendation and score_factors are always accessed together
- Complex nested structure
- Doesn't need individual queries

**Structure:**
```json
{
  "recommendation": {
    "verdict": "proceed",
    "verdict_label": "Strong Potential",
    "confidence": 78,
    "summary": "...",
    "conditions": ["...", "..."],
    "next_steps": ["...", "..."]
  },
  "score_factors": [
    {
      "factor": "Relevant tech background",
      "impact": "reduces development risk",
      "category": "execution"
    }
  ]
}
```

---

## Final Recommendation

### ✅ Normalized (Use Tables)

| Data | Storage | Reason |
|------|---------|--------|
| **Competitors** | `competitors` table | ✅ Already exists, readable, queryable |
| **Competitor Count/Categories** | `risk_analysis.competitor_analysis` JSONB | Summary only (count, categories) |

### ✅ JSONB (Complex Structures)

| Data | Storage | Reason |
|------|---------|--------|
| **Risk Analysis** | `risk_analysis` JSONB | Complex nested, always accessed together |
| **Top Risks** | `risk_analysis.top_risks` JSONB | Array of complex objects |
| **Demo Comparison** | `risk_analysis.demo_comparison` JSONB | Comparison metadata |
| **Recommendation** | `ai_insights.recommendation` JSONB | Complex nested object |
| **Score Factors** | `ai_insights.score_factors` JSONB | Array of objects |

---

## Implementation Plan

### Stage 1 Analysis Function Should:

1. **Generate Competitors** → Insert into `competitors` table
   ```typescript
   for (const competitor of analysis.competitors) {
     await supabase.from('competitors').insert({
       idea_id: ideaId,
       user_id: userId,
       name: competitor.name,
       website: competitor.website,
       pricing_model: extractPricingModel(competitor.pricing),
       pricing_amount: extractPricingAmount(competitor.pricing),
       key_features: competitor.key_features, // JSONB array
       our_differentiation: competitor.your_advantage,
       market_position: competitor.market_position,
       threat_level: calculateThreatLevel(competitor),
       data_source: 'ai_generated'
     })
   }
   ```

2. **Store Summary** → In `risk_analysis.competitor_analysis`
   ```json
   {
     "count": 5,
     "categories": ["Agricultural Technology", "Farm Management Software"]
   }
   ```

3. **Store Risk Analysis** → In `risk_analysis` JSONB
   - Category scores
   - Explanations
   - Top risks (enhanced structure)
   - Demo comparison

4. **Store AI Insights** → In `ai_insights` JSONB
   - Recommendation
   - Score factors

---

## Benefits of This Approach

### ✅ Readability
- Competitors are in a readable table
- Can query: `SELECT * FROM competitors WHERE idea_id = ?`
- Can filter: `WHERE threat_level > 7`
- Easy to read in SQL client

### ✅ Queryability
- Can JOIN competitors with ideas
- Can index competitor fields
- Can filter by competitor properties

### ✅ Maintainability
- Clear separation: normalized vs JSONB
- Easy to understand data structure
- Easy to add new competitor fields

### ✅ Performance
- Indexes on competitor fields
- Efficient queries on competitor table
- JSONB only for complex nested data

---

## Summary

**✅ Use `competitors` table** (already exists!)
- Store individual competitor records
- Easy to query and read
- Normalized structure

**✅ Keep JSONB for:**
- `risk_analysis` (complex nested risk data)
- `ai_insights` (recommendation + score factors)
- Summary data in `risk_analysis.competitor_analysis` (count, categories only)

**Database is ready** - just need to:
1. Use `competitors` table (not JSONB)
2. Structure JSONB correctly in code
3. Generate problem/audience/solution/monetization from wizard if NULL

