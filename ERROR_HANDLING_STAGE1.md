# Stage 1 Analysis - Complete Error Handling Documentation

## Overview

This document outlines **all error handling scenarios** in the Stage 1 analysis flow, from initial idea completion through analysis generation to database storage.

---

## 🔴 **Critical Errors** (Fail Entire Analysis)

These errors cause the entire Stage 1 analysis to fail and set status to `stage1_failed`:

### **1. Environment Variable Errors**
**Location:** `generateStage1Analysis()` - Lines 954-955

```typescript
const supabaseServiceKey = getSupabaseServiceKey()
getAnthropicApiKey() // Validate API key is present
```

**Error Scenarios:**
- ❌ `SUPABASE_SERVICE_ROLE_KEY` missing → Throws immediately
- ❌ `ANTHROPIC_API_KEY` missing → Throws immediately
- ❌ `SERPER_API_KEY` missing → Only affects competitor discovery (non-critical)

**Handling:**
- ✅ Throws error immediately
- ✅ Caught by outer try-catch (line 1115)
- ✅ Status updated to `stage1_failed`

---

### **2. Database Fetch Error**
**Location:** `generateStage1Analysis()` - Lines 963-973

```typescript
const { data: idea, error: fetchError } = await supabase
  .from('ideas')
  .select(...)
  .eq('id', ideaId)
  .single()

if (fetchError || !idea) {
  throw new Error(`Failed to fetch idea: ${fetchError?.message || 'Not found'}`)
}
```

**Error Scenarios:**
- ❌ Idea not found (404)
- ❌ Database connection timeout
- ❌ RLS policy blocks access (shouldn't happen with service role)
- ❌ Network error

**Handling:**
- ✅ Checks both `fetchError` and `!idea`
- ✅ Throws descriptive error with message
- ✅ Caught by outer try-catch
- ✅ Status updated to `stage1_failed`

---

### **3. Core Fields Generation Error**
**Location:** `generateCoreFieldsFromWizard()` - Lines 414-476

**Error Scenarios:**
- ❌ Anthropic API timeout (>30 seconds)
- ❌ Anthropic API rate limit (429)
- ❌ Anthropic API authentication error (401)
- ❌ Network error (connection refused, timeout)
- ❌ Invalid JSON response from Claude
- ❌ JSON.parse() throws (malformed JSON)

**Current Handling:**
- ⚠️ **NO try-catch wrapper** - Errors bubble up to main function
- ⚠️ **JSON.parse() unprotected** - Could throw if malformed
- ✅ Has fallback values (`parsed.problem || ''`)

**Impact:**
- ❌ If fails, entire analysis fails
- ✅ Main function catches and updates status

**Recommendation:**
- Add try-catch with fallback values
- Wrap JSON.parse in try-catch

---

### **4. Stage 1 Analysis Generation Error**
**Location:** `generateStage1AnalysisWithAI()` - Lines 592-905

**Error Scenarios:**
- ❌ Anthropic API timeout (>60 seconds)
- ❌ Anthropic API rate limit (429)
- ❌ Anthropic API authentication error (401)
- ❌ Network error
- ❌ Invalid JSON response (malformed)
- ❌ JSON.parse() throws
- ❌ Missing required fields in response

**Current Handling:**
- ⚠️ **NO try-catch wrapper** - Errors bubble up
- ⚠️ **JSON.parse() unprotected** - Line 848
- ✅ Has comprehensive fallback values (lines 874-903)
- ✅ Defaults to safe values (score: 50, risk_score: calculated)

**Impact:**
- ❌ If fails, entire analysis fails
- ✅ Main function catches and updates status

---

### **5. Database Update Error**
**Location:** `generateStage1Analysis()` - Lines 1094-1112

```typescript
const { error: updateError } = await supabase
  .from('ideas')
  .update({...})
  .eq('id', ideaId)

if (updateError) {
  throw new Error(`Failed to update idea: ${updateError.message}`)
}
```

**Error Scenarios:**
- ❌ Database connection timeout
- ❌ Constraint violation (e.g., invalid JSONB)
- ❌ RLS policy blocks update
- ❌ Network error

**Handling:**
- ✅ Checks for `updateError`
- ✅ Throws descriptive error
- ✅ Caught by outer try-catch
- ✅ Status update attempted in error handler (line 1119)

---

### **6. Error Status Update Failure**
**Location:** `generateStage1Analysis()` - Lines 1119-1134

```typescript
try {
  await supabase
    .from('ideas')
    .update({
      status: 'stage1_failed',
      error_message: errorMessage,
      error_occurred_at: new Date().toISOString()
    })
    .eq('id', ideaId)
} catch (updateError) {
  console.error('[STAGE1] Failed to update error status:', updateError)
}
```

**Error Scenarios:**
- ❌ Database completely down
- ❌ Network partition
- ❌ RLS blocks update

**Handling:**
- ✅ Nested try-catch prevents error from masking original error
- ✅ Logs to console
- ✅ Original error still re-thrown (line 1137)

---

## 🟡 **Graceful Degradation** (Analysis Continues)

These errors are caught and handled gracefully - analysis continues without the failed component:

### **7. Competitor Discovery Error**
**Location:** `generateStage1Analysis()` - Lines 1027-1056

```typescript
try {
  const searchResults = await searchCompetitorsWithSerper(...)
  if (searchResults.length > 0) {
    competitors = await analyzeCompetitorsWithClaude(...)
  }
} catch (competitorError) {
  console.error('[STAGE1] Competitor discovery failed:', competitorError)
  // Continue without competitors - don't fail the entire analysis
}
```

**Error Scenarios:**
- ❌ Serper API timeout
- ❌ Serper API rate limit
- ❌ Serper API key invalid
- ❌ Claude competitor analysis timeout
- ❌ Network error
- ❌ Invalid JSON from Claude

**Handling:**
- ✅ Wrapped in try-catch
- ✅ Logs error but continues
- ✅ `competitors` array remains empty `[]`
- ✅ Analysis completes successfully without competitors

**Impact:**
- ✅ Stage 1 analysis completes
- ✅ Score, risk_analysis, ai_insights all saved
- ⚠️ No competitors stored in database

---

### **8. Individual Serper Query Error**
**Location:** `searchCompetitorsWithSerper()` - Lines 221-242

```typescript
const searchResults = await Promise.all(
  queries.map(query =>
    fetch(...)
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
```

**Error Scenarios:**
- ❌ Single query timeout
- ❌ Single query rate limit
- ❌ Network error for one query
- ❌ Invalid JSON response

**Handling:**
- ✅ Each query has individual catch handler
- ✅ Returns empty result `{ organic: [], peopleAlsoAsk: [] }`
- ✅ Other queries continue in parallel
- ✅ Partial results still collected

**Impact:**
- ✅ Some queries succeed, some fail
- ✅ Results merged from successful queries
- ✅ Analysis continues with partial competitor data

---

### **9. Claude Competitor Analysis Error**
**Location:** `analyzeCompetitorsWithClaude()` - Lines 383-411

```typescript
try {
  const response = await anthropic.messages.create({...})
  // ... parse JSON ...
  return parsed.filter(...)
} catch (error) {
  console.error('[STAGE1] Claude competitor analysis failed:', error)
  return [] // Return empty array on error
}
```

**Error Scenarios:**
- ❌ Anthropic API timeout
- ❌ Anthropic API rate limit
- ❌ Network error
- ❌ Invalid JSON response
- ❌ JSON.parse() throws

**Handling:**
- ✅ Wrapped in try-catch
- ✅ Returns empty array `[]`
- ✅ Logs error
- ✅ Analysis continues with no competitors

**Impact:**
- ✅ Stage 1 analysis completes
- ✅ No competitors stored
- ✅ All other analysis data saved

---

### **10. Competitor Database Insert Error**
**Location:** `generateStage1Analysis()` - Lines 1082-1089

```typescript
const { error: competitorError } = await supabase
  .from('competitors')
  .insert(competitorInserts)

if (competitorError) {
  console.error('[STAGE1] Failed to insert competitors:', competitorError)
  // Don't fail the entire analysis if competitor insert fails
}
```

**Error Scenarios:**
- ❌ Database constraint violation
- ❌ Foreign key constraint (invalid idea_id)
- ❌ JSONB validation error
- ❌ Network timeout

**Handling:**
- ✅ Checks for error but doesn't throw
- ✅ Logs error
- ✅ Analysis continues successfully

**Impact:**
- ✅ Stage 1 analysis completes
- ✅ Idea status set to `complete`
- ⚠️ Competitors not stored (but analysis data is)

---

### **11. Title Generation Error**
**Location:** `generateTitle()` - Lines 908-933

```typescript
try {
  const response = await anthropic.messages.create({...})
  const title = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
  return title.replace(/^["']|["']$/g, '').trim() || ideaText.substring(0, 50)
} catch (error) {
  console.warn('[STAGE1] Title generation failed, using fallback:', error)
  return ideaText.substring(0, 50)
}
```

**Error Scenarios:**
- ❌ Anthropic API timeout
- ❌ Anthropic API error
- ❌ Network error

**Handling:**
- ✅ Wrapped in try-catch
- ✅ Returns fallback (first 50 chars of idea_text)
- ✅ Logs warning (not error)
- ✅ Analysis continues

**Impact:**
- ✅ Stage 1 analysis completes
- ✅ Title set to fallback value
- ✅ All other analysis data saved

---

### **12. URL Parsing Error**
**Location:** `extractCompanyName()` - Lines 123-134

```typescript
try {
  const domain = new URL(url).hostname
  return domain.replace(/^www\./, '').split('.')[0]
} catch {
  return url // Fallback to full URL
}
```

**Error Scenarios:**
- ❌ Invalid URL format
- ❌ Missing protocol

**Handling:**
- ✅ Wrapped in try-catch
- ✅ Returns full URL as fallback
- ✅ No error logged (silent fallback)

**Impact:**
- ✅ Competitor name extraction continues
- ✅ Uses full URL as name if parsing fails

---

## 🟢 **Error Recovery & Fallbacks**

### **Default Values Used:**

1. **Core Fields** (lines 470-475):
   - `problem: parsed.problem || ''`
   - `audience: parsed.audience || ''`
   - `solution: parsed.solution || ''`
   - `monetization: parsed.monetization || ''`

2. **Stage 1 Analysis** (lines 874-903):
   - `score: parsed.score || 50` (neutral score)
   - `risk_score: calculatedRiskScore` (calculated from defaults)
   - `risk_analysis: {...}` (full default structure)
   - `ai_insights: {...}` (full default structure)

3. **Title** (line 932):
   - `ideaText.substring(0, 50)` (first 50 chars)

4. **Competitors**:
   - Empty array `[]` on any error

---

## 📊 **Error Flow Diagram**

```
generateStage1Analysis()
  │
  ├─► Environment Variables Missing
  │   └─► ❌ FAIL: Throw → Catch → status: 'stage1_failed'
  │
  ├─► Fetch Idea from DB
  │   └─► ❌ FAIL: Throw → Catch → status: 'stage1_failed'
  │
  ├─► Generate Core Fields (if NULL)
  │   └─► ❌ FAIL: Throw → Catch → status: 'stage1_failed'
  │
  ├─► Generate Stage 1 Analysis
  │   └─► ❌ FAIL: Throw → Catch → status: 'stage1_failed'
  │
  ├─► Discover Competitors
  │   ├─► Serper Search
  │   │   ├─► ❌ Single Query Fails → Return empty result
  │   │   └─► ✅ Other queries continue
  │   ├─► Claude Analysis
  │   │   └─► ❌ FAIL → Return [] → Continue
  │   └─► ✅ Continue (competitors optional)
  │
  ├─► Generate Title (if NULL)
  │   └─► ❌ FAIL → Return fallback → Continue
  │
  ├─► Store Competitors
  │   └─► ❌ FAIL → Log error → Continue
  │
  ├─► Update Idea in DB
  │   └─► ❌ FAIL: Throw → Catch → status: 'stage1_failed'
  │
  └─► Update Error Status (if failed)
      └─► ❌ FAIL → Log only (already failed)
```

---

## ✅ **Error Handling Improvements (Implemented)**

### **1. Core Fields Generation** ✅
**Status:** Fixed with try-catch and JSON.parse protection

**Implementation:**
- ✅ Wrapped entire function in try-catch
- ✅ JSON.parse() wrapped in inner try-catch
- ✅ Returns empty strings on error (graceful degradation)
- ✅ Logs warnings/errors appropriately

**Result:** Analysis can continue even if core fields generation fails

---

### **2. Stage 1 Analysis Generation** ✅
**Status:** Fixed with JSON.parse protection

**Implementation:**
- ✅ JSON.parse() wrapped in try-catch
- ✅ Uses default values if parsing fails
- ✅ Logs errors appropriately
- ✅ Type-safe with proper fallbacks

**Result:** Analysis uses default values if JSON parsing fails

---

## ✅ **Summary**

**Critical Path (Must Succeed):**
1. Environment variables ✅
2. Database fetch ✅
3. Stage 1 analysis generation ✅
4. Database update ✅

**Optional Path (Graceful Degradation):**
1. Core fields generation (can use existing or empty)
2. Competitor discovery (can be empty)
3. Title generation (has fallback)
4. Competitor storage (can be skipped)

**Current Status:**
- ✅ **Excellent:** Main critical path has comprehensive error handling
- ✅ **Excellent:** Optional components have graceful degradation
- ✅ **Fixed:** Core fields generation has try-catch with graceful fallback
- ✅ **Fixed:** JSON.parse() calls are protected with try-catch
- ✅ **Production Ready:** All error scenarios handled robustly

