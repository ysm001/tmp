import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { UserProvider } from "@/components/providers/user-provider"
import { LoggerProvider } from "@/components/providers/logger-provider"
import { Providers } from "./providers"
import { cookies } from "next/headers"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { UserUseCase } from "@/lib/application/usecases/user-usecase"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Todo App",
  description: "A simple todo application with clean architecture",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get auth token from cookies
  const cookieStore = cookies()
  const authToken = cookieStore.get("auth-token")?.value

  const logger = container.get<Logger>(TYPES.Logger)
  const userUseCase = container.get<UserUseCase>(TYPES.UserUseCase)

  // Log the authentication attempt
  if (authToken) {
    logger.info("Auth token found in request")
  } else {
    logger.info("No auth token found in request")
  }

  // Get user data if we have a token
  const initialUser = authToken ? await userUseCase.getUserFromToken(authToken) : null

  // Convert user data to a format that can be serialized for the client
  const serializedUser = initialUser
    ? {
        id: initialUser.id,
        email: initialUser.email,
        name: initialUser.name,
        roles: initialUser.roles,
        permissions: [], // We don't pass permissions to the client for security
        createdAt: initialUser.createdAt.toISOString(),
        updatedAt: initialUser.updatedAt.toISOString(),
      }
    : null

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <LoggerProvider>
            <UserProvider initialUser={serializedUser}>{children}</UserProvider>
          </LoggerProvider>
        </Providers>
      </body>
    </html>
  )
}

