import { ClientLogger } from "@/lib/infrastructure/logger/client-logger"
import { describe, beforeEach, it, expect, jest, afterEach } from "@jest/globals"

describe("ClientLogger", () => {
  let logger: ClientLogger
  let consoleDebugSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Spy on console methods
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation()
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation()
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation()

    // Create a new logger instance for each test
    logger = new ClientLogger("debug")
  })

  afterEach(() => {
    // Restore console methods
    consoleDebugSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe("debug level", () => {
    it("should log debug messages when level is debug", () => {
      logger = new ClientLogger("debug")
      logger.debug("Test debug message")

      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Test debug message")
    })

    it("should not log debug messages when level is info", () => {
      logger = new ClientLogger("info")
      logger.debug("Test debug message")

      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })
  })

  describe("info level", () => {
    it("should log info messages when level is debug", () => {
      logger = new ClientLogger("debug")
      logger.info("Test info message")

      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Test info message")
    })

    it("should log info messages when level is info", () => {
      logger = new ClientLogger("info")
      logger.info("Test info message")

      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Test info message")
    })

    it("should not log info messages when level is warn", () => {
      logger = new ClientLogger("warn")
      logger.info("Test info message")

      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })
  })

  describe("warn level", () => {
    it("should log warn messages when level is info", () => {
      logger = new ClientLogger("info")
      logger.warn("Test warn message")

      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Test warn message")
    })

    it("should not log warn messages when level is error", () => {
      logger = new ClientLogger("error")
      logger.warn("Test warn message")

      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })

  describe("error level", () => {
    it("should always log error messages regardless of level", () => {
      // Test with all log levels
      const levels: Array<"debug" | "info" | "warn" | "error"> = ["debug", "info", "warn", "error"]

      levels.forEach((level) => {
        consoleErrorSpy.mockClear()
        logger = new ClientLogger(level)
        logger.error("Test error message")

        expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] Test error message")
      })
    })
  })

  describe("with additional arguments", () => {
    it("should pass additional arguments to console methods", () => {
      const additionalArgs = { userId: "123", action: "test" }

      logger.debug("Debug with args", additionalArgs)
      logger.info("Info with args", additionalArgs)
      logger.warn("Warn with args", additionalArgs)
      logger.error("Error with args", additionalArgs)

      expect(consoleDebugSpy).toHaveBeenCalledWith("[DEBUG] Debug with args", additionalArgs)
      expect(consoleInfoSpy).toHaveBeenCalledWith("[INFO] Info with args", additionalArgs)
      expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] Warn with args", additionalArgs)
      expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] Error with args", additionalArgs)
    })
  })
})

