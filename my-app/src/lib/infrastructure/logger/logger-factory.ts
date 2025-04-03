import type { Logger } from "./logger"
import { ConsoleLogger } from "./logger"
import { ClientLogger } from "./client-logger"

/**
 * Factory class to create the appropriate logger based on the environment
 */
export class LoggerFactory {
  /**
   * Creates a logger instance appropriate for the current environment
   */
  static createLogger(logLevel?: "debug" | "info" | "warn" | "error"): Logger {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      return new ClientLogger(logLevel)
    }

    // Server-side environment
    return new ConsoleLogger()
  }
}

