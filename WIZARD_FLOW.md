# Wizard Flow Architecture Documentation

## Overview

This document describes the complete flow from user idea submission through question wizard to Stage 1 analysis completion.

**Key Decisions:**
- ✅ Single `ideas` table (simpler, good enough for MVP)
- ✅ Next.js API routes (not Edge Functions - no timeout limits)
- ✅ Simple polling (2-3 seconds, not Realtime - simpler for MVP)
- ✅ Debounced auto-save (prevents data loss)
- ✅ One endpoint for create + generate (atomic, simpler)

---

## Database Schema

### `ideas` Table Structure

```sql
CREATE TABLE ideas (
  -- Core
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_text TEXT NOT NULL,
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'draft',
  -- Values: 'generating_questions' | 'questions_ready' | 'generation_failed' | 
  --         'generating_stage1' | 'complete'
  
  -- Wizard Data
  questions JSONB,                    -- AI-generated questions array (FIXED after generation)
  wizard_answers JSONB DEFAULT '{}',  -- User answers (CHANGES as user navigates)
  current_step INTEGER DEFAULT 0,      -- Which question user is viewing (0-based)
  
  -- Timestamps
  questions_generated_at TIMESTAMP,
  wizard_completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Analysis Results (Stage 1)
  score INTEGER,
  risk_score DECIMAL(3,1),
  ai_insights JSONB,
  risk_analysis JSONB,
  competitor_analysis JSONB,
  -- ... other analysis fields
);

-- Indexes
CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_questions_gin ON ideas USING GIN (questions);
CREATE INDEX idx_ideas_wizard_answers_gin ON ideas USING GIN (wizard_answers);

-- Trigger for updated_at
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### JSONB Structure Examples

**`questions` (Fixed after generation):**
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
    "type": "multiple",
    "text": "Who is your target audience?",
    "options": ["B2B", "B2C", "Both"],
    "required": true
  }
  // ... 5-10 more questions (AI generates 5-12 total)
]
```

**`wizard_answers` (Changes as user navigates):**
```json
{
  "q1": "My idea solves the problem of...",
  "q2": "B2B",
  "q3": "7",
  "q4": "Another answer..."
}
```

---

## Complete User Flow

### Phase 1: Idea Creation

```
1. User types idea in NewIdeaModal
2. User clicks "Let's Go" 🚀
   ↓
[Frontend] Validate idea (10-500 characters)
   ↓
[Frontend] Close modal
   ↓
[Frontend] Navigate to /ideas/new/wizard
   ↓
[Frontend] Show loading: "Creating your idea..."
   ↓
[API] POST /api/ideas
   Body: { idea_text: "..." }
   ↓
[Database] INSERT INTO ideas
   {
     idea_text: "...",
     user_id: auth.uid(),
     status: "generating_questions",
     wizard_answers: {},
     current_step: 0
   }
   ↓
[Background] Start question generation (async, don't await)
   → Calls AI service (~30 seconds)
   → Updates ideas table when complete
   ↓
[API] Return immediately
   { id: "uuid-123", status: "generating_questions" }
   ↓
[Frontend] Redirect to /ideas/[id]/wizard
   ↓
[Frontend] Start polling for status
```

### Phase 2: Question Generation (Background)

```
[Background Process] Question Generation
   ↓
[AI Service] Call Claude/OpenAI
   Prompt: "Generate 5-12 smart questions for this idea..."
   Time: ~30 seconds
   ↓
[AI Returns] Array of questions
   [
     { id: "q1", type: "text", text: "..." },
     { id: "q2", type: "multiple", ... },
     ...
   ]
   ↓
[Database] UPDATE ideas
   SET questions = [...],
       status = "questions_ready",
       questions_generated_at = NOW()
   WHERE id = idea_id
   ↓
[Frontend Poll] Detects status change
   → Stops polling
   → Loads questions from idea.questions
   → Renders Question 1
```

### Phase 3: User Answers Questions

```
[Frontend] Render Question 1 of N
   ↓
User types answer
   ↓
[Frontend] Update local state (instant UI)
   setAnswers({ "q1": "user's answer" })
   ↓
[Frontend] Save to localStorage (instant backup)
   localStorage.setItem(`idea-${ideaId}`, JSON.stringify(answers))
   ↓
[Frontend] Debounce timer (1 second)
   → Wait for user to stop typing
   ↓
[Frontend] Auto-save triggers
   ↓
[API] PATCH /api/ideas/[id]
   Body: {
     wizard_answers: { "q1": "answer" },
     current_step: 0
   }
   ↓
[Database] UPDATE ideas
   SET wizard_answers = {...},
       updated_at = NOW()
   ↓
[Trigger] Auto-updates updated_at
   ↓
[Frontend] User clicks "Next"
   ↓
[Frontend] Update current_step: 0 → 1
   ↓
[Frontend] Save navigation
   PATCH /api/ideas/[id] { current_step: 1 }
   ↓
[Frontend] Render Question 2
   ↓
... Repeat for all questions ...
```

**Back Navigation:**
```
User clicks "Back"
   ↓
[Frontend] Update current_step: 1 → 0
   ↓
[Frontend] Save navigation
   PATCH /api/ideas/[id] { current_step: 0 }
   ↓
[Frontend] Render previous question (answers preserved)
```

### Phase 4: Complete Wizard

```
User answers last question
   ↓
User clicks "Generate Analysis" or "Complete"
   ↓
[Frontend] Validate all required questions answered
   ↓
[API] POST /api/ideas/[id]/complete-wizard
   ↓
[Database] UPDATE ideas
   SET status = "generating_stage1",
       wizard_completed_at = NOW()
   ↓
[Background] Start Stage 1 analysis
   → Competitor analysis
   → Risk scoring
   → AI insights
   Time: ~60 seconds
   ↓
[Database] UPDATE ideas
   SET status = "complete",
       score = 75,
       risk_score = 6.5,
       ai_insights = {...},
       risk_analysis = {...},
       competitor_analysis = {...}
   ↓
[Frontend Poll] Detects status = "complete"
   ↓
[Frontend] Redirect to /ideas/[id] (results page)
```

---

## API Endpoints

### 1. Create Idea + Start Generation

**POST** `/api/ideas`

**Request:**
```json
{
  "idea_text": "An AI platform that helps..."
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid-123",
  "status": "generating_questions"
}
```

**Flow:**
1. Validate idea_text (10-500 chars)
2. Create idea record with status: "generating_questions"
3. Start question generation async (don't await)
4. Return immediately

**Error Handling:**
- If idea creation fails → Return 500 error
- If generation fails → Update status to "generation_failed"
- User can retry with separate endpoint

---

### 2. Get Idea Status (Polling)

**GET** `/api/ideas/[id]`

**Response:**
```json
{
  "success": true,
  "idea": {
    "id": "uuid-123",
    "status": "questions_ready",
    "idea_text": "...",
    "questions": [...],  // Only when status = "questions_ready"
    "wizard_answers": {...},
    "current_step": 0,
    "questions_generated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Polling Strategy:**
- Poll every 2-3 seconds
- Stop when status changes from "generating_questions"
- Maximum poll time: 60 seconds (then show error)

---

### 3. Auto-Save Answer

**PATCH** `/api/ideas/[id]`

**Request:**
```json
{
  "wizard_answers": {
    "q1": "answer text",
    "q2": "selected option"
  },
  "current_step": 2
}
```

**Response:**
```json
{
  "success": true,
  "updated_at": "2024-01-15T10:05:00Z"
}
```

**Implementation:**
- Debounced on frontend (1 second)
- Saves to localStorage immediately
- Updates database async
- Non-blocking (user can continue navigating)

---

### 4. Complete Wizard

**POST** `/api/ideas/[id]/complete-wizard`

**Request:**
```json
{}  // No body needed, validates answers from DB
```

**Response:**
```json
{
  "success": true,
  "status": "generating_stage1"
}
```

**Flow:**
1. Validate all required questions answered
2. Update status to "generating_stage1"
3. Start Stage 1 analysis (async)
4. Return immediately

---

### 5. Retry Question Generation (Optional)

**POST** `/api/ideas/[id]/retry-questions`

**Request:**
```json
{}  // Retries generation for existing idea
```

**Response:**
```json
{
  "success": true,
  "status": "generating_questions"
}
```

**Use Case:**
- Only needed if initial generation failed
- User clicks "Retry" button
- Same generation logic, just retry

---

## Frontend Flow

### Routes

```
/ideas/new/wizard
  → Shows loading while creating idea
  → Redirects to /ideas/[id]/wizard after creation

/ideas/[id]/wizard
  → Shows questions (if ready)
  → Polls for status (if generating)
  → Handles answer input and navigation

/ideas/[id]/generating
  → Shows loading during Stage 1 analysis
  → Polls for completion
  → Redirects to /ideas/[id] when done

/ideas/[id]
  → Shows completed analysis results
```

### State Management

```typescript
interface WizardState {
  ideaId: string | null
  status: 'generating_questions' | 'questions_ready' | 'generating_stage1' | 'complete'
  questions: Question[] | null  // Fixed after generation
  answers: Record<string, string>  // Changes as user navigates
  currentStep: number
  isSaving: boolean
  error: string | null
}
```

### Auto-Save Implementation

```typescript
// Debounced save function
const debouncedSave = useMemo(
  () => debounce(async (answers: Record<string, string>, step: number) => {
    setIsSaving(true)
    try {
      // Save to localStorage first
      localStorage.setItem(`idea-${ideaId}`, JSON.stringify(answers))
      
      // Save to database
      await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          wizard_answers: answers,
          current_step: step
        })
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Keep in localStorage, retry later
    } finally {
      setIsSaving(false)
    }
  }, 1000), // 1 second debounce
  [ideaId]
)

// Use on answer change
useEffect(() => {
  if (answers && ideaId) {
    debouncedSave(answers, currentStep)
  }
}, [answers, currentStep])
```

### Polling Implementation

```typescript
useEffect(() => {
  if (status === 'generating_questions' || status === 'generating_stage1') {
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/ideas/${ideaId}`)
      const data = await response.json()
      
      // Stop polling if status changed
      if (data.idea.status !== status) {
        setStatus(data.idea.status)
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds
    
    // Max polling time: 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval)
      setError('Generation is taking longer than expected...')
    }, 60000)
    
    return () => {
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }
}, [status, ideaId])
```

---

## Error Handling

### Scenario 1: Question Generation Fails

```
1. Idea created ✅
2. Generation fails ❌
3. Status: "generation_failed"
4. Frontend shows:
   - Error message
   - "Retry" button
   - "Skip Questions" button (optional)
5. User can:
   - Retry → POST /api/ideas/[id]/retry-questions
   - Skip → Continue without questions
```

### Scenario 2: Auto-Save Fails

```
1. Answer saved to localStorage ✅
2. Database save fails ❌
3. Show subtle error: "Saved locally"
4. Retry on next answer change
5. User can continue (data not lost)
```

### Scenario 3: Network Offline

```
1. All saves go to localStorage
2. Queue for sync when online
3. Show indicator: "Offline - saved locally"
4. Auto-sync when connection restored
```

### Scenario 4: User Closes Browser

```
1. All data saved to database ✅
2. localStorage has backup ✅
3. User returns later:
   - Load from database
   - Restore from localStorage if needed
   - Continue where left off
```

---

## Status Flow Diagram

```
"draft" (initial state)
  ↓
"generating_questions" (idea created, questions generating)
  ↓
"questions_ready" OR "generation_failed"
  ↓ (if ready, user answers)
"generating_stage1" (wizard completed, analysis starting)
  ↓
"complete" (all done)
```

---

## Performance Considerations

### Table Size
- Per idea: ~14 KB
- 10,000 ideas: ~140 MB
- 100,000 ideas: ~1.4 GB
- **Verdict:** Not a concern for years

### Polling Cost
- Every 2 seconds during 60s wait = 30 requests
- 100 concurrent users = 3,000 requests/hour
- **Verdict:** Negligible cost, acceptable for MVP

### When to Optimize
- **Add Realtime:** When > 1,000 concurrent users
- **Add Caching:** When queries slow down
- **Add Background Jobs:** When generations > 2 minutes
- **Split Tables:** When you need question history/tracking

---

## Future Improvements (Post-MVP)

1. **Realtime Subscriptions**
   - Replace polling with Supabase Realtime
   - Instant status updates
   - Cross-device sync

2. **Background Job Queue**
   - For long-running generations
   - Retry logic
   - Priority handling

3. **Question Progress Table**
   - Separate table if needed
   - For A/B testing questions
   - For version history

4. **Caching Layer**
   - Redis for frequent queries
   - Cache question templates
   - Reduce database load

---

## Testing Checklist

- [ ] Idea creation works
- [ ] Question generation completes
- [ ] Questions are saved correctly
- [ ] Auto-save works (debounced)
- [ ] Back navigation preserves answers
- [ ] Polling detects status changes
- [ ] Generation failure handled gracefully
- [ ] Auto-save failure doesn't block user
- [ ] Data persists after browser close
- [ ] Completion triggers Stage 1 analysis
- [ ] Stage 1 completion redirects correctly

---

## Summary

**Simple MVP Architecture:**
- ✅ Single table (ideas)
- ✅ One endpoint for create + generate
- ✅ Simple polling (2-3 seconds)
- ✅ Debounced auto-save
- ✅ Non-blocking flow (redirect + poll)
- ✅ Minimal complexity
- ✅ Fast to ship
- ✅ Easy to debug

**Can optimize later if needed.**

