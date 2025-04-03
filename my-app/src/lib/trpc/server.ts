import { initTRPC, TRPCError } from "@trpc/server"
import type { CreateNextContextOptions } from "@trpc/server/adapters/next"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"

export interface Context {
  userId?: string
  email?: string
  roles?: string[]
  permissions?: Array<{ action: string; resource: string }>
  isAuthenticated: boolean
  logger: Logger
  authorizationService: AuthorizationService
}

export const createContext = async ({ req }: CreateNextContextOptions): Promise<Context> => {
  const logger = container.get<Logger>(TYPES.Logger)
  const authorizationService = container.get<AuthorizationService>(TYPES.AuthorizationService)

  // Get user information from request headers (set by middleware)
  const userId = req.headers["x-user-id"] as string | undefined
  const email = req.headers["x-user-email"] as string | undefined
  const rolesHeader = req.headers["x-user-roles"] as string | undefined
  const permissionsHeader = req.headers["x-user-permissions"] as string | undefined

  let roles: string[] = []
  if (rolesHeader) {
    try {
      roles = JSON.parse(rolesHeader)
    } catch (error) {
      logger.error("Error parsing roles from header", error)
    }
  }

  let permissions: Array<{ action: string; resource: string }> = []
  if (permissionsHeader) {
    try {
      permissions = JSON.parse(permissionsHeader)
    } catch (error) {
      logger.error("Error parsing permissions from header", error)
    }
  }

  const isAuthenticated = !!userId

  return {
    userId,
    email,
    roles,
    permissions,
    isAuthenticated,
    logger,
    authorizationService,
  }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

// Middleware to check if user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.isAuthenticated || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    })
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  })
})

// Middleware to check if user has permission for an action on a resource
const hasPermission = (action: string, resource: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      })
    }

    // Use the AuthorizationService to check permission
    const hasRequiredPermission = await ctx.authorizationService.hasPermission(ctx.userId, action, resource)

    if (!hasRequiredPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have permission to ${action} this ${resource}`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    })
  })

// Middleware to check if user has a specific role
const hasRole = (role: string) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      })
    }

    // Use the AuthorizationService to check role
    const hasRequiredRole = await ctx.authorizationService.hasRole(ctx.userId, role)

    if (!hasRequiredRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You need the ${role} role to access this resource`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    })
  })

// Middleware to check resource ownership
const isResourceOwner = (getResourceOwnerId: (input: any) => Promise<string | undefined>) =>
  t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      })
    }

    const resourceOwnerId = await getResourceOwnerId(input)

    // If we couldn't determine the owner, allow access
    if (!resourceOwnerId) {
      return next({
        ctx: {
          ...ctx,
          userId: ctx.userId,
        },
      })
    }

    // Use the AuthorizationService to check ownership
    const isOwner = await ctx.authorizationService.isResourceOwner(ctx.userId, resourceOwnerId)

    if (!isOwner) {
      // Check if user has admin role as a fallback
      const isAdmin = await ctx.authorizationService.hasRole(ctx.userId, "admin")

      if (!isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        })
      }
    }

    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId,
      },
    })
  })

export const protectedProcedure = t.procedure.use(isAuthenticated)
export const createAuthMiddleware = {
  isAuthenticated,
  hasPermission,
  hasRole,
  isResourceOwner,
}

