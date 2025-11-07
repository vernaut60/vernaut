# Schema Mapping: Mock Data → Database Schema

## ✅ Direct Column Mappings (Already in Schema)

| Mock Data Field | Schema Column | Status |
|----------------|---------------|--------|
| `idea.title` | `title` | ✅ Direct match |
| `idea.problem` | `problem` | ✅ Direct match |
| `idea.audience` | `audience` | ✅ Direct match |
| `idea.solution` | `solution` | ✅ Direct match |
| `idea.monetization` | `monetization` | ✅ Direct match |
| `stage1.score` | `score` | ✅ Direct match |
| `stage1.risk_score` | `risk_score` | ✅ Direct match |

## 📦 JSONB Storage Required

### `risk_analysis` JSONB (Stores risk categories + top risks)

**Current Schema Structure:**
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
      "severity": "High",
      "likelihood": "High",
      "description": "...",
      "mitigation": "..."
    }
  ]
}
```

**What Needs to be Added:**
```json
{
  // ... existing fields ...
  
  // ADD: Demo comparison data (if demo exists)
  "demo_comparison": {
    "has_demo": true,
    "demo_score": 85,
    "demo_risk_score": 6.9,
    "score_difference": 2,
    "risk_difference": -0.4,
    "category_changes": {
      "market_timing": { "demo_score": 6.5, "change": 0 },
      "competition_level": { "demo_score": 7.5, "change": 0 },
      "business_viability": { "demo_score": 7.0, "change": -0.5 },
      "execution_difficulty": { "demo_score": 6.0, "change": -1.5 }
    }
  },
  
  // ENHANCE: top_risks structure (needs more fields)
  "top_risks": [
    {
      "title": "...",
      "severity": 7.5,  // number, not string
      "category": "Competition",  // ADD
      "why_it_matters": "...",  // ADD
      "mitigation_steps": ["...", "..."],  // ADD (array instead of single string)
      "timeline": "Month 1-2",  // ADD
      "likelihood": "High",
      "description": "...",
      "mitigation": "..."  // Keep for backward compatibility
    }
  ]
}
```

### `ai_insights` JSONB (Stores recommendation + score factors)

**Current:** Not clearly defined in schema

**Should Store:**
```json
{
  "recommendation": {
    "verdict": "proceed",  // "proceed" | "pivot" | "needs_work"
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

### `competitor_analysis` JSONB (Stores competitors)

**Current:** Not in schema - might be in `risk_analysis` or separate

**Should Store:**
```json
{
  "count": 5,
  "categories": ["Agricultural Technology", "Farm Management Software"],
  "competitors": [
    {
      "name": "FarmLogs",
      "website": "https://farmlogs.com",
      "pricing": "$199/month",
      "key_features": ["...", "..."],
      "your_advantage": "...",
      "market_position": "leader"  // "leader" | "challenger" | "niche"
    }
  ]
}
```

## ❌ Missing Fields

### Demo Data (Not Stored - Calculated/Transient)
- `demo.exists` - Can be calculated from checking if demo data exists
- `demo.score` - Would be in a separate `guest_ideas` table or not stored
- `demo.risk_score` - Same as above
- `demo.label` - Static: "Preliminary Assessment"
- `demo.generated_at` - Would be in `guest_ideas` table

**Note:** Demo comparison is likely stored in `guest_ideas` table, not in `ideas` table.

## ✅ Summary

### Ready:
- ✅ All basic fields (title, problem, audience, solution, monetization)
- ✅ Score and risk_score columns
- ✅ `risk_analysis` JSONB column exists

### Needs Enhancement:
1. **`risk_analysis` JSONB** - Needs to store:
   - Demo comparison data (if demo exists)
   - Enhanced top_risks structure (category, why_it_matters, mitigation_steps array, timeline)

2. **`ai_insights` JSONB** - Needs to store:
   - Recommendation object (verdict, confidence, summary, conditions, next_steps)
   - Score factors array

3. **`competitor_analysis` JSONB** - Needs to be added OR stored in existing JSONB:
   - Competitors array with full details
   - Categories array
   - Count

### Action Items:
1. ✅ Schema has columns - just need to populate correctly
2. ⚠️ Need to enhance JSONB structure to match mock data
3. ⚠️ Need to decide: store `competitor_analysis` in separate JSONB or in `risk_analysis`?

