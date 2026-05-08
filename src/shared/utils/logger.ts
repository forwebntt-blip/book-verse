type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
  module?: string;
  [key: string]: unknown;
}

class Logger {
  private write(level: LogLevel, message: string, context?: LogContext) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    const serialized = JSON.stringify(payload);

    if (level === "error") {
      console.error(serialized);
      return;
    }

    console.log(serialized);
  }

  debug(message: string, context?: LogContext) {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.write("warn", message, context);
  }

  error(message: string, error: unknown, context?: LogContext) {
    const normalized =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : { errorValue: error };

    this.write("error", message, {
      ...context,
      ...normalized,
    });
  }
}

export const logger = new Logger();
