type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

class Logger {
  private context: string
  private isDevelopment: boolean

  constructor(context: string) {
    this.context = context
    this.isDevelopment = process.env.NODE_ENV === "development"
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const logEntry = this.createLogEntry(level, message, data)
    const formattedMessage = `[${logEntry.timestamp}] [${this.context}] [${level.toUpperCase()}]: ${message}`

    // In production, we would send logs to a service like Vercel Logs, LogDNA, etc.
    // For now, we'll just console log
    switch (level) {
      case "debug":
        if (this.isDevelopment) console.debug(formattedMessage, data || "")
        break
      case "info":
        console.info(formattedMessage, data || "")
        break
      case "warn":
        console.warn(formattedMessage, data || "")
        break
      case "error":
        console.error(formattedMessage, data || "")
        break
    }

    // In a real application, we would also store logs in a database
    // or send them to a logging service
  }

  debug(message: string, data?: any): void {
    this.log("debug", message, data)
  }

  info(message: string, data?: any): void {
    this.log("info", message, data)
  }

  warn(message: string, data?: any): void {
    this.log("warn", message, data)
  }

  error(message: string, data?: any): void {
    this.log("error", message, data)
  }
}

// Factory function to create loggers with context
export function createLogger(context: string): Logger {
  return new Logger(context)
}

