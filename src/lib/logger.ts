/**
 * Centralized logging utility for the application
 * Provides consistent logging format and can be extended to send logs to external services
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    }
    return logEntry
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = this.formatLog(level, message, context)
    
    // Console output
    switch (level) {
      case 'error':
        console.error(`[${logEntry.timestamp}] ERROR:`, message, context || '')
        break
      case 'warn':
        console.warn(`[${logEntry.timestamp}] WARN:`, message, context || '')
        break
      case 'debug':
        console.debug(`[${logEntry.timestamp}] DEBUG:`, message, context || '')
        break
      default:
        console.log(`[${logEntry.timestamp}] INFO:`, message, context || '')
    }

    // TODO: Send to external logging service (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   sendToLoggingService(logEntry)
    // }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log error messages
   */
  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context)
    }
  }

  /**
   * Log authentication-related errors
   */
  authError(message: string, context?: LogContext) {
    this.error(`[Auth] ${message}`, {
      ...context,
      category: 'authentication',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
    })
  }

  /**
   * Log session-related errors (legacy compatibility)
   */
  sessionError(message: string, context?: LogContext) {
    this.authError(message, { ...context, subcategory: 'session' })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export legacy function for backwards compatibility
export const logSessionError = (message: string, context?: LogContext) => {
  logger.sessionError(message, context)
}

