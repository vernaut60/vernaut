-- Migration: Rate limiting and de-dup cache for refine-text API
-- Creates:
--  - rate_limits table (per-user, per-endpoint, per-window counters)
--  - refine_cache table (per-user input hash -> result cache)
--  - check_rate_limit() SQL function (atomic increment + decision)

-- 1) rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT rate_limits_pk PRIMARY KEY (user_id, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON public.rate_limits (user_id, endpoint);

-- 2) refine_cache table
CREATE TABLE IF NOT EXISTS public.refine_cache (
  user_id UUID NOT NULL,
  input_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT refine_cache_pk PRIMARY KEY (user_id, input_hash)
);

CREATE INDEX IF NOT EXISTS idx_refine_cache_created_at
  ON public.refine_cache (created_at DESC);

-- 3) Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refine_cache ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies
-- Users can only access their own rate limit data
CREATE POLICY "Users can view their own rate limits"
  ON public.rate_limits
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own rate limits"
  ON public.rate_limits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rate limits"
  ON public.rate_limits
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only access their own cache entries
CREATE POLICY "Users can view their own cache"
  ON public.refine_cache
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cache"
  ON public.refine_cache
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own cache"
  ON public.refine_cache
  FOR DELETE
  USING (user_id = auth.uid());

-- 5) Atomic rate limit function
-- Window uses p_window_seconds (e.g., 60)
-- Returns one row { allowed, limit_val, remaining, reset_at }
-- Uses SECURITY DEFINER to bypass RLS for atomic operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  limit_val INTEGER,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_count INTEGER;
  v_reset TIMESTAMPTZ := v_window_start + make_interval(secs => p_window_seconds);
BEGIN
  -- Insert or atomically increment the counter for this bucket
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING public.rate_limits.count INTO v_count;

  allowed := (v_count <= p_limit);
  limit_val := p_limit;
  remaining := GREATEST(p_limit - v_count, 0);
  reset_at := v_reset;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 6) Cleanup function for old rate limit windows (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 7) Cleanup function for old cache entries (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_refine_cache()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.refine_cache
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8) Add table comments
COMMENT ON TABLE public.rate_limits IS 'Per-user, per-endpoint rate limiting counters with sliding window buckets';
COMMENT ON TABLE public.refine_cache IS 'De-duplication cache for refine-text API to prevent redundant Claude API calls';
COMMENT ON FUNCTION public.check_rate_limit IS 'Atomically increments rate limit counter and returns allowance status';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Removes rate limit entries older than 24 hours';
COMMENT ON FUNCTION public.cleanup_old_refine_cache IS 'Removes cache entries older than 7 days';


