// ============================================
// LOGGING SYSTEM
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatTimestamp(): string {
    return new Date().toISOString()
  }

  private formatLog(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`

    if (context && Object.keys(context).length > 0) {
      log += ` | Context: ${JSON.stringify(context)}`
    }

    if (error) {
      log += ` | Error: ${error.message}`
      if (error.stack) {
        log += ` | Stack: ${error.stack}`
      }
    }

    return log
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: this.formatTimestamp(),
      context,
      error,
    }

    const formatted = this.formatLog(entry)

    // Console output (development only for debug)
    if (this.isDevelopment) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
      console[consoleMethod](formatted)
    } else {
      // Production: log to external service
      if (level === 'error') {
        console.error(formatted)
      }
    }

    // TODO: Send to external logging service (Sentry, LogRocket, etc)
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, context, error)
  }

  // Structured logging for tracing
  trace(functionName: string, action: 'enter' | 'exit', context?: Record<string, unknown>) {
    const message = `${functionName} [${action}]`
    this.debug(message, context)
  }
}

// Export singleton instance
export const logger = new Logger()
