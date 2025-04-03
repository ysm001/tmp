import { type NextRequest, NextResponse } from "next/server"
import { middleware } from "@/middleware"
import { jwtVerify } from "jose"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import { describe, beforeEach, it, expect, jest } from "@jest/globals"

// Mock Next.js modules
jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server")
  return {
    ...originalModule,
    NextResponse: {
      next: jest.fn(() => ({ headers: new Map(), cookies: { set: jest.fn() } })),
      redirect: jest.fn(() => ({})),
      json: jest.fn(() => ({})),
    },
  }
})

// Mock jose for JWT verification
jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}))

// Mock container and services
jest.mock("@/lib/infrastructure/di/container", () => ({
  container: {
    get: jest.fn(),
  },
}))

describe("Middleware", () => {
  let mockRequest: NextRequest
  let mockAuthService: AuthorizationService
  let mockLogger: Logger

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    // Mock authorization service
    mockAuthService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      hasRole: jest.fn().mockResolvedValue(false),
      isResourceOwner: jest.fn().mockResolvedValue(false),
    }

    // Setup container mock
    ;(container.get as jest.Mock).mockImplementation((type) => {
      if (type === TYPES.Logger) return mockLogger
      if (type === TYPES.AuthorizationService) return mockAuthService
      return null
    })

    // Setup default mock request
    mockRequest = {
      nextUrl: {
        pathname: "/",
        href: "http://localhost:3000/",
      },
      cookies: {
        get: jest.fn(),
      },
      headers: {
        get: jest.fn(),
      },
    } as unknown as NextRequest
  })

  describe("Static assets", () => {
    it("should skip middleware for static assets", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/_next/static/chunks/main.js"

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(container.get).not.toHaveBeenCalled()
    })

    it("should skip middleware for favicon", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/favicon.ico"

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(container.get).not.toHaveBeenCalled()
    })
  })

  describe("Public pages", () => {
    it("should allow access to login page without authentication", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/login"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue(null)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("should allow access to register page without authentication", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/register"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue(null)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe("Protected pages", () => {
    it("should redirect to login when accessing protected page without auth", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue(null)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(NextResponse.next).not.toHaveBeenCalled()
    })

    it("should allow access to protected page with valid auth", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
        },
      })

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("should redirect to unauthorized page when user lacks permission", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/admin"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
        },
      })
      ;(mockAuthService.hasPermission as jest.Mock).mockResolvedValue(false)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(mockAuthService.hasPermission).toHaveBeenCalledWith("user-123", "admin", "system")
    })

    it("should allow access when user has required permission", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos/create"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
        },
      })
      ;(mockAuthService.hasPermission as jest.Mock).mockResolvedValue(true)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(mockAuthService.hasPermission).toHaveBeenCalledWith("user-123", "create", "todo")
    })
  })

  describe("tRPC routes", () => {
    it("should return 401 for tRPC route without auth", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/api/trpc/todo.getAll"
      ;(mockRequest.headers.get as jest.Mock).mockReturnValue(null)
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue(null)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Authentication required" }, { status: 401 })
    })

    it("should process tRPC route with valid auth header", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/api/trpc/todo.getAll"
      ;(mockRequest.headers.get as jest.Mock).mockImplementation((name) => {
        if (name === "authorization") return "Bearer valid-token"
        return null
      })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
          permissions: [{ action: "read", resource: "todo" }],
        },
      })

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(jwtVerify).toHaveBeenCalled()
    })

    it("should process tRPC route with valid auth cookie", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/api/trpc/todo.getAll"
      ;(mockRequest.headers.get as jest.Mock).mockReturnValue(null)
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
          permissions: [{ action: "read", resource: "todo" }],
        },
      })

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalled()
      expect(jwtVerify).toHaveBeenCalled()
    })

    it("should return 401 for tRPC route with invalid token", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/api/trpc/todo.getAll"
      ;(mockRequest.headers.get as jest.Mock).mockImplementation((name) => {
        if (name === "authorization") return "Bearer invalid-token"
        return null
      })
      ;(jwtVerify as jest.Mock).mockRejectedValue(new Error("Invalid token"))

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Invalid or expired token" }, { status: 401 })
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe("JWT verification", () => {
    it("should set user information in cookies when JWT is valid", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
        },
      })

      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      }
      ;(NextResponse.next as jest.Mock).mockReturnValue(mockResponse)

      // Act
      await middleware(mockRequest)

      // Assert
      expect(mockResponse.cookies.set).toHaveBeenCalledWith("user-id", "user-123", expect.any(Object))
      expect(mockResponse.cookies.set).toHaveBeenCalledWith("user-email", "user@example.com", expect.any(Object))
      expect(mockResponse.cookies.set).toHaveBeenCalledWith("user-roles", JSON.stringify(["user"]), expect.any(Object))
    })

    it("should set headers for server components when JWT is valid", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "valid-token" })
      ;(jwtVerify as jest.Mock).mockResolvedValue({
        payload: {
          userId: "user-123",
          email: "user@example.com",
          roles: ["user"],
        },
      })

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.next).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            headers: expect.any(Object),
          }),
        }),
      )
    })

    it("should redirect to login when JWT verification fails", async () => {
      // Arrange
      mockRequest.nextUrl.pathname = "/todos"
      ;(mockRequest.cookies.get as jest.Mock).mockReturnValue({ value: "invalid-token" })
      ;(jwtVerify as jest.Mock).mockRejectedValue(new Error("Invalid token"))

      // Act
      await middleware(mockRequest)

      // Assert
      expect(NextResponse.redirect).toHaveBeenCalled()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})

