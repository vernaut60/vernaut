# Database Scalability: Supporting 7 More Stages

## Current State

**Stages:**
- Stage 1: Idea Validation ✅ (Current)
- Stage 2: Financial Projections (Locked)
- Stage 3: Go-to-Market Strategy (Locked)
- Stage 4: Product Roadmap (Locked)
- Stage 5: Team & Hiring Plan (Locked)
- Stage 6: Funding Strategy (Locked)
- Stage 7: Execution Plan (Locked)

**Current Schema:**
- Stage 1 specific: `score`, `risk_score`, `risk_analysis`, `ai_insights`
- General: `market_analysis`, `analysis_metadata`

---

## Problem: Current Schema is NOT Scalable

### ❌ Current Issues:

1. **Stage 1 has hardcoded columns:**
   - `score` (Stage 1 only)
   - `risk_score` (Stage 1 only)
   - `risk_analysis` (Stage 1 only)
   - `ai_insights` (Stage 1 only)

2. **Can't add 7 more stages without:**
   - Adding 7 more score columns?
   - Adding 7 more analysis JSONB columns?
   - This would be messy and unmaintainable

3. **No way to track:**
   - Which stages are completed
   - Stage-specific statuses
   - Stage generation timestamps

---

## ✅ Recommended Scalable Solution

### Option 1: Stage-Specific JSONB Column (Recommended)

**Single column for all stages:**
```sql
ALTER TABLE ideas
ADD COLUMN stages JSONB DEFAULT '{}';
```

**Structure:**
```json
{
  "stage1": {
    "status": "complete",
    "completed_at": "2024-12-15T10:00:00Z",
    "score": 87,
    "risk_score": 6.5,
    "risk_analysis": {...},
    "ai_insights": {...}
  },
  "stage2": {
    "status": "locked",
    "unlocked_at": null,
    "completed_at": null,
    "financial_projections": {...},
    "revenue_model": {...},
    "pricing_strategy": {...}
  },
  "stage3": {
    "status": "locked",
    "gtm_strategy": {...},
    "channels": [...],
    "customer_acquisition": {...}
  },
  ...
}
```

**Benefits:**
- ✅ One column for all stages
- ✅ Flexible structure per stage
- ✅ Easy to add new stages
- ✅ No schema changes needed

**Drawbacks:**
- ⚠️ All in JSONB (harder to query)
- ⚠️ Need to parse JSONB for stage data

---

### Option 2: Separate `idea_stages` Table (Best for Readability)

**Create new table:**
```sql
CREATE TABLE idea_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  stage_number INTEGER NOT NULL CHECK (stage_number >= 1 AND stage_number <= 8),
  stage_name TEXT NOT NULL,  -- 'idea_validation', 'financial_projections', etc.
  
  status VARCHAR(50) DEFAULT 'locked',  -- 'locked', 'unlocked', 'generating', 'complete', 'failed'
  
  -- Stage-specific data (flexible JSONB)
  stage_data JSONB DEFAULT '{}',
  
  -- Timestamps
  unlocked_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one stage per idea
  UNIQUE(idea_id, stage_number)
);

-- Indexes
CREATE INDEX idx_idea_stages_idea_id ON idea_stages(idea_id);
CREATE INDEX idx_idea_stages_user_id ON idea_stages(user_id);
CREATE INDEX idx_idea_stages_stage_number ON idea_stages(stage_number);
CREATE INDEX idx_idea_stages_status ON idea_stages(status);
CREATE INDEX idx_idea_stages_stage_data_gin ON idea_stages USING GIN (stage_data);
```

**Benefits:**
- ✅ **Readable**: Can query `SELECT * FROM idea_stages WHERE idea_id = ? AND stage_number = 2`
- ✅ **Queryable**: Can filter `WHERE status = 'complete'`
- ✅ **Indexable**: Can index status, stage_number
- ✅ **Scalable**: Add new stages without schema changes
- ✅ **Trackable**: Clear status and timestamps per stage
- ✅ **Normalized**: One row per stage per idea

**Structure Example:**
```sql
-- Stage 1 row
INSERT INTO idea_stages (idea_id, user_id, stage_number, stage_name, status, stage_data, completed_at)
VALUES (
  'idea-uuid',
  'user-uuid',
  1,
  'idea_validation',
  'complete',
  '{
    "score": 87,
    "risk_score": 6.5,
    "risk_analysis": {...},
    "ai_insights": {...}
  }'::JSONB,
  NOW()
);

-- Stage 2 row (locked)
INSERT INTO idea_stages (idea_id, user_id, stage_number, stage_name, status)
VALUES (
  'idea-uuid',
  'user-uuid',
  2,
  'financial_projections',
  'locked'
);
```

---

### Option 3: Hybrid Approach (Best Balance)

**Keep Stage 1 in `ideas` table (backward compatible), add `idea_stages` for future:**

```sql
-- Keep existing Stage 1 columns in ideas table
-- Add idea_stages table for Stages 2-8

CREATE TABLE idea_stages (
  -- Same as Option 2
  ...
);
```

**Benefits:**
- ✅ Backward compatible (Stage 1 data stays in `ideas` table)
- ✅ Clean structure for new stages
- ✅ Can migrate Stage 1 later if needed

---

## 🎯 Final Recommendation: Option 2 (Separate Table)

### Why This is Best:

1. **Readability** ✅
   ```sql
   -- Easy to read in SQL client
   SELECT stage_name, status, completed_at 
   FROM idea_stages 
   WHERE idea_id = ? 
   ORDER BY stage_number;
   ```

2. **Queryability** ✅
   ```sql
   -- Find all completed stages
   SELECT * FROM idea_stages WHERE status = 'complete';
   
   -- Find ideas stuck in generation
   SELECT idea_id, stage_name FROM idea_stages WHERE status = 'generating';
   ```

3. **Scalability** ✅
   - Add Stage 9, 10, 11... without schema changes
   - Each stage gets its own row
   - Flexible JSONB for stage-specific data

4. **Maintainability** ✅
   - Clear structure: one row = one stage
   - Easy to understand
   - Easy to debug

---

## Migration Strategy

### Step 1: Create `idea_stages` Table
```sql
-- Migration: Create idea_stages table for multi-stage support
CREATE TABLE idea_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number >= 1 AND stage_number <= 20),
  stage_name TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'locked',
  stage_data JSONB DEFAULT '{}',
  unlocked_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(idea_id, stage_number)
);

-- Indexes
CREATE INDEX idx_idea_stages_idea_id ON idea_stages(idea_id);
CREATE INDEX idx_idea_stages_user_id ON idea_stages(user_id);
CREATE INDEX idx_idea_stages_stage_number ON idea_stages(stage_number);
CREATE INDEX idx_idea_stages_status ON idea_stages(status);
CREATE INDEX idx_idea_stages_stage_data_gin ON idea_stages USING GIN (stage_data);
```

### Step 2: Migrate Existing Stage 1 Data (Optional)

**Option A: Keep in `ideas` table (simpler)**
- Stage 1 stays in `ideas.score`, `ideas.risk_score`, etc.
- Stages 2-8 go in `idea_stages` table

**Option B: Migrate to `idea_stages` (cleaner)**
- Move Stage 1 data to `idea_stages` table
- Keep `ideas` table for core idea data only

### Step 3: Update Status Values

**Add stage-specific statuses:**
```sql
ALTER TABLE ideas 
DROP CONSTRAINT IF EXISTS ideas_status_check;

ALTER TABLE ideas 
ADD CONSTRAINT ideas_status_check
CHECK (status IN (
  'draft',
  'generating_questions',
  'questions_ready',
  'generation_failed',
  'generating_stage1',
  'stage1_failed',
  'stage1_complete',  -- NEW
  'generating_stage2',  -- NEW
  'stage2_complete',  -- NEW
  ...
  'complete',  -- All stages done
  'error'
));
```

**OR simpler:**
```sql
-- Keep status for wizard flow only
-- Use idea_stages.status for stage status
```

---

## Stage Data Structure Examples

### Stage 1 (Idea Validation)
```json
{
  "score": 87,
  "risk_score": 6.5,
  "risk_analysis": {...},
  "ai_insights": {...},
  "competitor_summary": {
    "count": 5,
    "categories": [...]
  }
}
```

### Stage 2 (Financial Projections)
```json
{
  "revenue_model": {
    "type": "subscription",
    "pricing_tiers": [...],
    "projected_mrr": {...}
  },
  "financial_projections": {
    "year_1": {...},
    "year_2": {...},
    "year_3": {...}
  },
  "break_even_analysis": {...},
  "funding_requirements": {...}
}
```

### Stage 3 (Go-to-Market)
```json
{
  "gtm_strategy": {...},
  "channels": [
    {
      "name": "LinkedIn",
      "priority": 1,
      "tactics": [...]
    }
  ],
  "customer_acquisition": {
    "cac": 150,
    "ltv": 2400,
    "payback_period": 3
  },
  "launch_plan": {...}
}
```

---

## Summary

### ✅ Recommended: `idea_stages` Table

**Benefits:**
- ✅ Readable (one row per stage)
- ✅ Queryable (filter by status, stage_number)
- ✅ Scalable (add unlimited stages)
- ✅ Maintainable (clear structure)
- ✅ Indexable (performance)

**Implementation:**
1. Create `idea_stages` table
2. Keep Stage 1 in `ideas` table (for now) OR migrate it
3. Store Stages 2-8 in `idea_stages` table
4. Use `stage_data` JSONB for stage-specific content

**The database will be ready for 7+ more stages without schema changes!**

