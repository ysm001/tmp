"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import { clientLogger } from "@/lib/infrastructure/logger/client-logger"

// Create a context for the logger
const LoggerContext = createContext<Logger>(clientLogger)

interface LoggerProviderProps {
  children: ReactNode
  logger?: Logger
}

/**
 * Provider component that makes the logger available throughout the client-side app
 */
export function LoggerProvider({ children, logger = clientLogger }: LoggerProviderProps) {
  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>
}

/**
 * Hook to access the logger in client components
 */
export function useLogger(): Logger {
  return useContext(LoggerContext)
}

