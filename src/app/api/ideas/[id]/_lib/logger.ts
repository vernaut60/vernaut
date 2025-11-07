// Error logging utility
export const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(`[IDEAS_API_ERROR] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

// Info logging utility
export const logInfo = (message: string, context: Record<string, unknown> = {}) => {
  console.log(`[IDEAS_API_INFO] ${message}`, {
    timestamp: new Date().toISOString(),
    context
  })
}

