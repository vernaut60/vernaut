# Current `ideas` Table Schema

## Complete Column List

```sql
CREATE TABLE ideas (
  -- Core Identity & Content
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_text TEXT NOT NULL,
  problem TEXT,                                    -- NULLABLE (wizard flow)
  audience TEXT,                                   -- NULLABLE (wizard flow)
  solution TEXT,                                   -- NULLABLE (wizard flow)
  monetization TEXT,                               -- NULLABLE (wizard flow)
  title VARCHAR(255),
  
  -- User & Timestamps
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Wizard Flow Fields
  status VARCHAR(50) DEFAULT 'draft',
  questions JSONB,
  wizard_answers JSONB DEFAULT '{}',
  current_step INTEGER DEFAULT 0,
  total_questions INTEGER,
  questions_generated_at TIMESTAMP WITH TIME ZONE,
  wizard_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error Tracking
  error_message TEXT,
  error_occurred_at TIMESTAMP WITH TIME ZONE,
  
  -- Analysis Results (Stage 1)
  ai_insights JSONB,
  score INTEGER,
  risk_score DECIMAL(3,1),
  risk_analysis JSONB,
  
  -- Pro Analysis (Premium Tier)
  full_analysis_unlocked BOOLEAN DEFAULT false,
  market_analysis JSONB,
  analysis_metadata JSONB,
  full_analysis_generated_at TIMESTAMP WITH TIME ZONE
);
```

## Status Values (CHECK Constraint)

```sql
status IN (
  'draft',
  'generating_questions',
  'questions_ready',
  'generation_failed',
  'generating_stage1',
  'stage1_failed',
  'complete',
  'error'
)
```

## Indexes

```sql
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_title ON ideas(title);
CREATE INDEX idx_ideas_score ON ideas(score);
CREATE INDEX idx_ideas_risk_score ON ideas(risk_score);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_current_step ON ideas(current_step);
CREATE INDEX idx_ideas_user_idea_text ON ideas(user_id, idea_text);
CREATE INDEX idx_ideas_full_analysis_unlocked ON ideas(full_analysis_unlocked);
CREATE INDEX idx_ideas_full_analysis_generated_at ON ideas(full_analysis_generated_at);

-- GIN Indexes for JSONB columns
CREATE INDEX idx_ideas_questions_gin ON ideas USING GIN (questions);
CREATE INDEX idx_ideas_wizard_answers_gin ON ideas USING GIN (wizard_answers);
CREATE INDEX idx_ideas_ai_insights_gin ON ideas USING GIN (ai_insights);
CREATE INDEX idx_ideas_risk_analysis_gin ON ideas USING GIN (risk_analysis);
CREATE INDEX idx_ideas_market_analysis_gin ON ideas USING GIN (market_analysis);
CREATE INDEX idx_ideas_analysis_metadata_gin ON ideas USING GIN (analysis_metadata);
```

## Constraints

```sql
-- Unique constraint: one idea text per user
ALTER TABLE ideas ADD CONSTRAINT unique_user_idea_text 
  UNIQUE (user_id, idea_text);

-- Status check constraint
ALTER TABLE ideas ADD CONSTRAINT ideas_status_check
  CHECK (status IN (
    'draft',
    'generating_questions',
    'questions_ready',
    'generation_failed',
    'generating_stage1',
    'stage1_failed',
    'complete',
    'error'
  ));
```

## Triggers

```sql
-- Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Column Descriptions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `idea_text` | TEXT | NO | - | User's original idea text |
| `problem` | TEXT | YES | - | Problem statement (nullable for wizard flow) |
| `audience` | TEXT | YES | - | Target audience (nullable for wizard flow) |
| `solution` | TEXT | YES | - | Solution description (nullable for wizard flow) |
| `monetization` | TEXT | YES | - | Monetization strategy (nullable for wizard flow) |
| `title` | VARCHAR(255) | YES | - | Clean, truncated title for display |
| `user_id` | UUID | YES | - | Foreign key to auth.users |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Last update timestamp (auto-updated) |
| `status` | VARCHAR(50) | NO | `'draft'` | Wizard flow status |
| `questions` | JSONB | YES | - | AI-generated questions array (fixed after generation) |
| `wizard_answers` | JSONB | NO | `'{}'` | User answers object |
| `current_step` | INTEGER | NO | `0` | Current question index (0-based) |
| `total_questions` | INTEGER | YES | - | Total number of questions |
| `questions_generated_at` | TIMESTAMPTZ | YES | - | When questions were generated |
| `wizard_completed_at` | TIMESTAMPTZ | YES | - | When wizard was completed |
| `error_message` | TEXT | YES | - | Error message if generation failed |
| `error_occurred_at` | TIMESTAMPTZ | YES | - | When error occurred |
| `ai_insights` | JSONB | YES | - | AI-generated insights and breakdown |
| `score` | INTEGER | YES | - | Overall idea score (0-100) |
| `risk_score` | DECIMAL(3,1) | YES | - | Overall risk score (0-10) |
| `risk_analysis` | JSONB | YES | - | Detailed risk breakdown |
| `full_analysis_unlocked` | BOOLEAN | NO | `false` | Has user unlocked Pro analysis? |
| `market_analysis` | JSONB | YES | - | Market data (TAM, SAM, SOM, etc.) |
| `analysis_metadata` | JSONB | YES | - | Analysis generation metadata |
| `full_analysis_generated_at` | TIMESTAMPTZ | YES | - | When Pro analysis was created |

## JSONB Structure Examples

### `questions` (Fixed after generation)
```json
[
  {
    "id": "q1",
    "type": "text",
    "text": "What specific problem does your idea solve?",
    "required": true,
    "validation": { "minLength": 20 }
  },
  {
    "id": "q2",
    "type": "radio",
    "text": "Who is your target audience?",
    "options": ["B2B", "B2C", "Both"],
    "required": true
  }
]
```

### `wizard_answers` (Changes as user navigates)
```json
{
  "q1": "My idea solves the problem of...",
  "q2": "B2B",
  "q3": "7",
  "q4": ["option1", "option2"]
}
```

### `risk_analysis` (Stage 1 result)
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

