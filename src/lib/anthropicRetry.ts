// lib/anthropicRetry.ts

export async function callAnthropicWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    operationName?: string
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 60000,
    operationName = 'Anthropic API call'
  } = options

  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RETRY] ${operationName} - Attempt ${attempt + 1}/${maxRetries + 1}`)
      return await fn()
    } catch (error: unknown) {
      lastError = error as Error
      
      // Check if it's a retryable error
      const errorObj = error as { status?: number; error?: { type?: string }; message?: string }
      const isOverloaded = errorObj?.status === 500 || 
                          errorObj?.error?.type === 'api_error' ||
                          errorObj?.message?.includes('Overloaded')
      
      const isRateLimit = errorObj?.status === 429
      
      if (!isOverloaded && !isRateLimit) {
        // Not retryable - throw immediately
        throw error
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.error(`[RETRY] ${operationName} - All retries exhausted`)
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
      
      console.warn(
        `[RETRY] ${operationName} failed with ${errorObj?.error?.type || errorObj?.status || 'unknown error'}. ` +
        `Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`
      )
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

