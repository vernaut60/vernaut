// Error logging and monitoring utility

interface ErrorLog {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  userAgent: string
  url: string
  userId?: string
  sessionId?: string
  errorType: 'auth' | 'network' | 'validation' | 'timeout' | 'rate_limit' | 'session' | 'retry' | 'boundary'
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, unknown>
}

class ErrorLogger {
  private static instance: ErrorLogger
  private logs: ErrorLog[] = []
  private maxLogs = 100 // Keep last 100 logs in memory

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  private constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers()
  }

  private setupGlobalErrorHandlers() {
    // Only set up global error handlers on the client side
    if (typeof window === 'undefined') {
      return
    }

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        errorType: 'boundary',
        severity: 'high',
        context: { reason: event.reason }
      })
    })

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        errorType: 'boundary',
        severity: 'high',
        context: { 
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })
  }

  logError(errorData: Partial<ErrorLog> & { message: string; errorType: ErrorLog['errorType'] }) {
    const log: ErrorLog = {
      message: errorData.message,
      stack: errorData.stack,
      componentStack: errorData.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
      userId: errorData.userId,
      sessionId: errorData.sessionId,
      errorType: errorData.errorType,
      severity: errorData.severity || 'medium',
      context: errorData.context || {}
    }

    // Add to in-memory logs
    this.logs.unshift(log)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = this.getSeverityEmoji(log.severity)
      console.error(`${emoji} [${log.errorType.toUpperCase()}] ${log.message}`)
      console.error('Error Details:', {
        timestamp: log.timestamp,
        severity: log.severity,
        context: log.context,
        userAgent: log.userAgent,
        url: log.url,
        logs: this.logs.length
      })
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(log)
    }
  }

  private getSeverityEmoji(severity: ErrorLog['severity']): string {
    switch (severity) {
      case 'low': return '🔵'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  private async sendToMonitoringService(log: ErrorLog) {
    try {
      // Only send to monitoring service on the client side
      if (typeof window === 'undefined') {
        return
      }

      // In a real application, you would send this to your monitoring service
      // Examples: Sentry, LogRocket, Bugsnag, DataDog, etc.
      
      // For now, we'll just log to console in production
      console.error('Production Error Log:', log)
      
      // Example: Send to Sentry
      // Sentry.captureException(new Error(log.message), {
      //   tags: {
      //     errorType: log.errorType,
      //     severity: log.severity
      //   },
      //   extra: log.context
      // })
      
    } catch (error) {
      console.error('Failed to send error to monitoring service:', error)
    }
  }

  // Get recent error logs
  getRecentLogs(limit: number = 10): ErrorLog[] {
    return this.logs.slice(0, limit)
  }

  // Get logs by error type
  getLogsByType(errorType: ErrorLog['errorType']): ErrorLog[] {
    return this.logs.filter(log => log.errorType === errorType)
  }

  // Get logs by severity
  getLogsBySeverity(severity: ErrorLog['severity']): ErrorLog[] {
    return this.logs.filter(log => log.severity === severity)
  }

  // Clear all logs
  clearLogs() {
    this.logs = []
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Convenience functions for different error types
export const logAuthError = (message: string, context?: Record<string, unknown>) => {
  // Only log on client side to prevent SSR issues
  if (typeof window === 'undefined') {
    return
  }
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'auth',
    severity: 'high',
    context
  })
}

export const logNetworkError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'network',
    severity: 'medium',
    context
  })
}

export const logValidationError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'validation',
    severity: 'low',
    context
  })
}

export const logTimeoutError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'timeout',
    severity: 'medium',
    context
  })
}

export const logRateLimitError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'rate_limit',
    severity: 'medium',
    context
  })
}

export const logSessionError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'session',
    severity: 'high',
    context
  })
}

export const logRetryError = (message: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    errorType: 'retry',
    severity: 'medium',
    context
  })
}

export const logBoundaryError = (message: string, stack?: string, context?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  
  ErrorLogger.getInstance().logError({
    message,
    stack,
    errorType: 'boundary',
    severity: 'critical',
    context
  })
}

// Export the logger instance
export const errorLogger = ErrorLogger.getInstance()
export default ErrorLogger
