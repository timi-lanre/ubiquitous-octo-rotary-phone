type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private logToConsole(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;

    const { level, message, context } = entry;
    
    if (this.isDevelopment) {
      // Development: Full logging with context
      switch (level) {
        case 'debug':
          console.debug(`[DEBUG] ${message}`, context);
          break;
        case 'info':
          console.info(`[INFO] ${message}`, context);
          break;
        case 'warn':
          console.warn(`[WARN] ${message}`, context);
          break;
        case 'error':
          console.error(`[ERROR] ${message}`, context);
          break;
      }
    } else {
      // Production: Minimal logging without sensitive data
      switch (level) {
        case 'warn':
          console.warn(`[WARN] ${message}`);
          break;
        case 'error':
          console.error(`[ERROR] ${message}`);
          break;
      }
    }
  }

  private async logToExternalService(entry: LogEntry) {
    if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'warn')) {
      try {
        // In production, send to external logging service
        // This would be implemented based on your chosen logging service
        // Example: await fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
        
        // For now, we'll just store it locally as a fallback
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
        logs.push(entry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('app_logs', JSON.stringify(logs));
      } catch (error) {
        // Fallback to console if external logging fails
        console.error('Failed to log to external service:', error);
      }
    }
  }

  debug(message: string, context?: Record<string, any>) {
    const entry = this.formatMessage('debug', message, context);
    this.logToConsole(entry);
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.formatMessage('info', message, context);
    this.logToConsole(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    const entry = this.formatMessage('warn', message, context);
    this.logToConsole(entry);
    this.logToExternalService(entry);
  }

  error(message: string, context?: Record<string, any>) {
    const entry = this.formatMessage('error', message, context);
    this.logToConsole(entry);
    this.logToExternalService(entry);
  }
}

export const logger = new Logger();
