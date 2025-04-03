import { injectable, inject } from "inversify"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"
import { PrismaClient } from "@prisma/client"

@injectable()
export class AuthorizationServiceImpl implements AuthorizationService {
  private prisma: PrismaClient;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.prisma = new PrismaClient();
  }

  async hasPermission(userId: string, action: string, resource: string, resourceOwnerId?: string): Promise<boolean> {
    this.logger.info(`Checking permission for user ${userId}: ${action} on ${resource}`)

    // If the resource has an owner and the user is the owner, allow access
    if (resourceOwnerId && userId === resourceOwnerId) {
      return true
    }

    try {
      // Check if user has admin role (admins have all permissions)
      const isAdmin = await this.hasRole(userId, "admin")
      if (isAdmin) {
        return true
      }

      // Check if user has the specific permission through their roles
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      })

      if (!user) {
        return false
      }

      // Check if any of the user's roles have the required permission
      return user.roles.some((role) =>
        role.permissions.some((permission) => permission.action === action && permission.resource === resource),
      )
    } catch (error) {
      this.logger.error(`Error checking permission for user ${userId}`, error)
      return false
    }
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    this.logger.info(`Checking if user ${userId} has role ${role}`)

    try {
      const count = await this.prisma.user.count({
        where: {
          id: userId,
          roles: {
            some: {
              name: role,
            },
          },
        },
      })

      return count > 0
    } catch (error) {
      this.logger.error(`Error checking role for user ${userId}`, error)
      return false
    }
  }

  async isResourceOwner(userId: string, resourceOwnerId: string): Promise<boolean> {
    return userId === resourceOwnerId
  }
}

