"use client"

import { useLogger } from "@/components/providers/logger-provider"

/**
 * Hook to access the logger in client components
 * This is a convenience wrapper around useLogger from the LoggerProvider
 */
export function useClientLogger() {
  return useLogger()
}

