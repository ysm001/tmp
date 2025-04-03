import type { Logger } from "./logger"

/**
 * Client-side logger implementation that works in the browser
 * and maintains the same interface as the server-side logger
 */
export class ClientLogger implements Logger {
  private logLevel: "debug" | "info" | "warn" | "error"

  constructor(logLevel: "debug" | "info" | "warn" | "error" = "info") {
    this.logLevel = logLevel
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  private shouldLog(level: "debug" | "info" | "warn" | "error"): boolean {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }

    return levels[level] >= levels[this.logLevel]
  }
}

// Create a singleton instance for client-side use
export const clientLogger = new ClientLogger(process.env.NODE_ENV === "production" ? "warn" : "debug")

