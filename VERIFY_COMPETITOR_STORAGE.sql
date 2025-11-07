-- =====================================================
-- Verify Competitor Data Storage
-- Run this in Supabase SQL Editor to check stored data
-- =====================================================

-- Replace 'YOUR_IDEA_ID' with your actual idea ID
-- Example: '225faaba-0393-484a-846b-3e21b1a8b139'

-- 1. Check all competitors for an idea
SELECT 
  id,
  name,
  website,
  description,
  pricing_model,
  pricing_amount,
  key_features,
  our_differentiation,
  threat_level,
  is_direct_competitor,
  data_source,
  confidence_score,
  created_at
FROM competitors
WHERE idea_id = 'YOUR_IDEA_ID'
ORDER BY threat_level DESC, created_at DESC;

-- 2. Verify structured positioning is in description
SELECT 
  name,
  description,
  CASE 
    WHEN description LIKE '%. % pricing:%' THEN '✅ Structured positioning found'
    ELSE '❌ No structured positioning'
  END as positioning_check,
  pricing_model,
  pricing_amount
FROM competitors
WHERE idea_id = 'YOUR_IDEA_ID';

-- 3. Check pricing extraction
SELECT 
  name,
  pricing_model,
  pricing_amount,
  CASE 
    WHEN pricing_model IS NOT NULL THEN '✅ Pricing model extracted'
    ELSE '❌ No pricing model'
  END as pricing_model_check,
  CASE 
    WHEN pricing_amount IS NOT NULL THEN '✅ Pricing amount extracted'
    ELSE '⚠️ No pricing amount (might be "Contact for pricing")'
  END as pricing_amount_check
FROM competitors
WHERE idea_id = 'YOUR_IDEA_ID';

-- 4. Summary statistics
SELECT 
  COUNT(*) as total_competitors,
  COUNT(CASE WHEN is_direct_competitor = true THEN 1 END) as direct_competitors,
  COUNT(CASE WHEN pricing_model IS NOT NULL THEN 1 END) as with_pricing_model,
  COUNT(CASE WHEN pricing_amount IS NOT NULL THEN 1 END) as with_pricing_amount,
  AVG(threat_level) as avg_threat_level,
  MAX(threat_level) as max_threat_level,
  MIN(threat_level) as min_threat_level
FROM competitors
WHERE idea_id = 'YOUR_IDEA_ID';

-- 5. Sample competitor with all fields
SELECT *
FROM competitors
WHERE idea_id = 'YOUR_IDEA_ID'
LIMIT 1;

