import { TRPCError } from "@trpc/server"
import { createAuthMiddleware } from "@/lib/trpc/server"
import type { Context } from "@/lib/trpc/server"

describe("tRPC Auth Middleware", () => {
  let mockContext: Context
  let mockNext: jest.Mock

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock logger
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }

    // Mock authorization service
    const mockAuthService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      hasRole: jest.fn().mockResolvedValue(false),
      isResourceOwner: jest.fn().mockResolvedValue(false),
    }

    // Setup mock context
    mockContext = {
      userId: "user-123",
      email: "user@example.com",
      roles: ["user"],
      permissions: [{ action: "read", resource: "todo" }],
      isAuthenticated: true,
      logger: mockLogger,
      authorizationService: mockAuthService,
    }

    // Setup mock next function
    mockNext = jest.fn().mockImplementation(({ ctx }) => ({
      ctx,
    }))
  })

  describe("isAuthenticated middleware", () => {
    it("should throw UNAUTHORIZED error when user is not authenticated", async () => {
      // Arrange
      const { isAuthenticated } = createAuthMiddleware
      const unauthenticatedContext = { ...mockContext, isAuthenticated: false, userId: undefined }

      // Act & Assert
      await expect(isAuthenticated({ ctx: unauthenticatedContext, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should call next with context when user is authenticated", async () => {
      // Arrange
      const { isAuthenticated } = createAuthMiddleware

      // Act
      await isAuthenticated({ ctx: mockContext, next: mockNext } as any)

      // Assert
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })
  })

  describe("hasPermission middleware", () => {
    it("should throw UNAUTHORIZED error when user is not authenticated", async () => {
      // Arrange
      const { hasPermission } = createAuthMiddleware
      const unauthenticatedContext = { ...mockContext, isAuthenticated: false, userId: undefined }
      const middleware = hasPermission("read", "todo")

      // Act & Assert
      await expect(middleware({ ctx: unauthenticatedContext, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should throw FORBIDDEN error when user lacks permission", async () => {
      // Arrange
      const { hasPermission } = createAuthMiddleware
      mockContext.authorizationService.hasPermission = jest.fn().mockResolvedValue(false)
      const middleware = hasPermission("update", "todo")

      // Act & Assert
      await expect(middleware({ ctx: mockContext, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(mockContext.authorizationService.hasPermission).toHaveBeenCalledWith("user-123", "update", "todo")
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should call next with context when user has permission", async () => {
      // Arrange
      const { hasPermission } = createAuthMiddleware
      mockContext.authorizationService.hasPermission = jest.fn().mockResolvedValue(true)
      const middleware = hasPermission("read", "todo")

      // Act
      await middleware({ ctx: mockContext, next: mockNext } as any)

      // Assert
      expect(mockContext.authorizationService.hasPermission).toHaveBeenCalledWith("user-123", "read", "todo")
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })
  })

  describe("hasRole middleware", () => {
    it("should throw UNAUTHORIZED error when user is not authenticated", async () => {
      // Arrange
      const { hasRole } = createAuthMiddleware
      const unauthenticatedContext = { ...mockContext, isAuthenticated: false, userId: undefined }
      const middleware = hasRole("admin")

      // Act & Assert
      await expect(middleware({ ctx: unauthenticatedContext, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should throw FORBIDDEN error when user lacks role", async () => {
      // Arrange
      const { hasRole } = createAuthMiddleware
      mockContext.authorizationService.hasRole = jest.fn().mockResolvedValue(false)
      const middleware = hasRole("admin")

      // Act & Assert
      await expect(middleware({ ctx: mockContext, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(mockContext.authorizationService.hasRole).toHaveBeenCalledWith("user-123", "admin")
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should call next with context when user has role", async () => {
      // Arrange
      const { hasRole } = createAuthMiddleware
      mockContext.authorizationService.hasRole = jest.fn().mockResolvedValue(true)
      const middleware = hasRole("user")

      // Act
      await middleware({ ctx: mockContext, next: mockNext } as any)

      // Assert
      expect(mockContext.authorizationService.hasRole).toHaveBeenCalledWith("user-123", "user")
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })
  })

  describe("isResourceOwner middleware", () => {
    it("should throw UNAUTHORIZED error when user is not authenticated", async () => {
      // Arrange
      const { isResourceOwner } = createAuthMiddleware
      const unauthenticatedContext = { ...mockContext, isAuthenticated: false, userId: undefined }
      const getResourceOwnerId = jest.fn().mockResolvedValue("owner-123")
      const middleware = isResourceOwner(getResourceOwnerId)

      // Act & Assert
      await expect(middleware({ ctx: unauthenticatedContext, input: {}, next: mockNext } as any)).rejects.toThrow(
        TRPCError,
      )

      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should call next when resource has no owner", async () => {
      // Arrange
      const { isResourceOwner } = createAuthMiddleware
      const getResourceOwnerId = jest.fn().mockResolvedValue(undefined)
      const middleware = isResourceOwner(getResourceOwnerId)

      // Act
      await middleware({ ctx: mockContext, input: {}, next: mockNext } as any)

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })

    it("should call next when user is the resource owner", async () => {
      // Arrange
      const { isResourceOwner } = createAuthMiddleware
      const getResourceOwnerId = jest.fn().mockResolvedValue("user-123")
      mockContext.authorizationService.isResourceOwner = jest.fn().mockResolvedValue(true)
      const middleware = isResourceOwner(getResourceOwnerId)

      // Act
      await middleware({ ctx: mockContext, input: {}, next: mockNext } as any)

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalled()
      expect(mockContext.authorizationService.isResourceOwner).toHaveBeenCalledWith("user-123", "user-123")
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })

    it("should throw FORBIDDEN error when user is not the owner and not admin", async () => {
      // Arrange
      const { isResourceOwner } = createAuthMiddleware
      const getResourceOwnerId = jest.fn().mockResolvedValue("owner-123")
      mockContext.authorizationService.isResourceOwner = jest.fn().mockResolvedValue(false)
      mockContext.authorizationService.hasRole = jest.fn().mockResolvedValue(false)
      const middleware = isResourceOwner(getResourceOwnerId)

      // Act & Assert
      await expect(middleware({ ctx: mockContext, input: {}, next: mockNext } as any)).rejects.toThrow(TRPCError)

      expect(getResourceOwnerId).toHaveBeenCalled()
      expect(mockContext.authorizationService.isResourceOwner).toHaveBeenCalledWith("user-123", "owner-123")
      expect(mockContext.authorizationService.hasRole).toHaveBeenCalledWith("user-123", "admin")
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should call next when user is not the owner but is admin", async () => {
      // Arrange
      const { isResourceOwner } = createAuthMiddleware
      const getResourceOwnerId = jest.fn().mockResolvedValue("owner-123")
      mockContext.authorizationService.isResourceOwner = jest.fn().mockResolvedValue(false)
      mockContext.authorizationService.hasRole = jest.fn().mockResolvedValue(true)
      const middleware = isResourceOwner(getResourceOwnerId)

      // Act
      await middleware({ ctx: mockContext, input: {}, next: mockNext } as any)

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalled()
      expect(mockContext.authorizationService.isResourceOwner).toHaveBeenCalledWith("user-123", "owner-123")
      expect(mockContext.authorizationService.hasRole).toHaveBeenCalledWith("user-123", "admin")
      expect(mockNext).toHaveBeenCalledWith({
        ctx: expect.objectContaining({
          userId: "user-123",
        }),
      })
    })
  })
})

