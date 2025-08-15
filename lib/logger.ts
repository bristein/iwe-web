/**
 * Structured logging utility for better debugging and monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private context: LogContext = {};

  constructor(private name: string) {}

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      logger: this.name,
      message,
      ...this.context,
      ...context,
    };

    // In production, this could be sent to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Use JSON format for production logs
      console[level === 'debug' ? 'log' : level](JSON.stringify(logEntry));
    } else {
      // Use readable format for development
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.name}]`;
      if (context && Object.keys(context).length > 0) {
        console[level === 'debug' ? 'log' : level](prefix, message, context);
      } else {
        console[level === 'debug' ? 'log' : level](prefix, message);
      }
    }
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.log('error', message, errorContext);
  }

  child(context: LogContext): Logger {
    const childLogger = new Logger(this.name);
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }
}

// Factory function to create loggers
export function createLogger(name: string): Logger {
  return new Logger(name);
}

// Pre-configured loggers for different modules
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('database');
export const apiLogger = createLogger('api');
