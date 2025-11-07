# Data Flow: Demo Data & Problem/Audience/Solution/Monetization

## Question 1: Demo Data Source

### Where Demo Data is Stored

**Answer: `guest_ideas` table (separate from `ideas` table)**

**Flow:**
1. User tries demo on landing page → Creates entry in `guest_ideas` table
   - `guest_session_id` (from localStorage)
   - `idea_text`
   - `problem`, `audience`, `solution`, `monetization` (generated from AI)
   - `score`, `risk_score`, `risk_analysis` (demo analysis results)

2. User signs up/logs in → Handoff process
   - `/api/demo/handoff` endpoint transfers latest `guest_ideas` → `ideas` table
   - **Copies ALL fields** including `problem`, `audience`, `solution`, `monetization`, `score`, `risk_score`, `risk_analysis`
   - See: `src/app/api/demo/handoff/route.ts` lines 188-199

3. After handoff:
   - Demo data is now in `ideas` table
   - `guest_ideas` entry remains (not deleted, but not used anymore)

### How to Retrieve Demo Data for Comparison

**Current Implementation:**
- Demo data is **copied into `ideas` table** during handoff
- After handoff, demo data lives in the same `ideas` row

**For Comparison:**
- When generating Stage 1 analysis, check if idea already has:
  - `score` (demo score)
  - `risk_score` (demo risk score)
  - `risk_analysis` (demo risk analysis)
- If these exist, use them for comparison
- If they don't exist, no demo → no comparison

**Recommendation:**
Store demo metadata in `ideas` table:
```sql
-- Add to ideas table (or use existing JSONB)
demo_metadata JSONB
-- Structure:
{
  "has_demo": true,
  "demo_score": 85,
  "demo_risk_score": 6.9,
  "demo_generated_at": "2024-12-15T10:00:00Z",
  "demo_label": "Preliminary Assessment"
}
```

**OR** store in `risk_analysis` JSONB:
```json
{
  "overall_score": 6.5,
  "demo_comparison": {
    "has_demo": true,
    "demo_score": 85,
    "demo_risk_score": 6.9,
    "score_difference": 2,
    "risk_difference": -0.4
  }
}
```

---

## Question 2: Problem/Audience/Solution/Monetization Logic

### Current Behavior

**Demo Flow (Landing Page):**
- Generated from AI analysis of `idea_text` only
- Stored in `guest_ideas` table
- See: `src/app/api/refine-idea/route.ts` lines 230-252
- AI prompt: "Analyze this idea and return problem, audience, solution, monetization"

**Handoff Flow:**
- Copied from `guest_ideas` → `ideas` table
- See: `src/app/api/demo/handoff/route.ts` lines 192-195
- **These fields are PRESERVED** (not regenerated)

**Wizard Flow (No Demo):**
- Currently: **NOT GENERATED** during wizard
- Wizard only collects `wizard_answers`
- `problem`, `audience`, `solution`, `monetization` remain NULL

### Recommended Logic

**Option A: Generate from Wizard Answers (Recommended)**

```
If problem/audience/solution/monetization are NULL:
  → Generate from wizard_answers during Stage 1 analysis
  → Use AI to extract/summarize from wizard answers
  → Store in ideas table

If problem/audience/solution/monetization EXIST:
  → NEVER regenerate (preserve demo data)
  → Use existing values
```

**Implementation:**
- In Stage 1 analysis function, check if fields are NULL
- If NULL, generate from `wizard_answers` using AI
- If EXISTS, use existing values (preserve demo data)

**Option B: Always Generate from Wizard (Overwrites Demo)**

```
Always generate from wizard_answers:
  → Even if demo data exists
  → Overwrites demo values
  → Uses wizard context for better accuracy
```

**Not Recommended** - loses demo comparison context

---

## Recommended Implementation

### 1. Demo Data Storage

**Store in `risk_analysis` JSONB:**
```json
{
  "overall_score": 6.5,
  "category_scores": {...},
  "demo_comparison": {
    "has_demo": true,
    "demo_score": 85,
    "demo_risk_score": 6.9,
    "demo_generated_at": "2024-12-15T10:00:00Z",
    "score_difference": 2,
    "risk_difference": -0.4,
    "category_changes": {
      "market_timing": {"demo_score": 6.5, "change": 0},
      "competition_level": {"demo_score": 7.5, "change": 0},
      "business_viability": {"demo_score": 7.0, "change": -0.5},
      "execution_difficulty": {"demo_score": 6.0, "change": -1.5}
    }
  }
}
```

### 2. Problem/Audience/Solution/Monetization Logic

**In Stage 1 Analysis Function:**

```typescript
// Check if fields exist (from demo)
const hasExistingFields = 
  idea.problem && 
  idea.audience && 
  idea.solution && 
  idea.monetization

if (hasExistingFields) {
  // Use existing (from demo) - NEVER regenerate
  // Preserve for comparison
} else {
  // Generate from wizard_answers
  // Extract/summarize using AI
  // Store in ideas table
}
```

---

## Summary

### Demo Data:
- ✅ Stored in `guest_ideas` table initially
- ✅ Copied to `ideas` table during handoff
- ⚠️ Need to store demo metadata for comparison (use `risk_analysis.demo_comparison`)

### Problem/Audience/Solution/Monetization:
- ✅ If EXISTS (from demo) → **NEVER regenerate** (preserve)
- ✅ If NULL (no demo) → **Generate from wizard_answers** during Stage 1
- ✅ Logic: Check if fields exist, if not, generate from wizard context

