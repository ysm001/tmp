import { PrismaClient } from "@prisma/client"
import { injectable, inject } from "inversify"
import type { UserRepository } from "@/lib/domain/repositories/user-repository"
import type { User, Permission } from "@/lib/domain/entities/user"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import { TYPES } from "@/lib/infrastructure/di/types"

@injectable()
export class PrismaUserRepository implements UserRepository {
  private prisma: PrismaClient;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.prisma = new PrismaClient()
  }

  async findById(id: string): Promise<User | null> {
    this.logger.info(`Finding user by id: ${id}`)
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      })

      if (!user) {
        return null
      }

      // Transform the data to match our domain entity
      const permissions: Permission[] = user.roles.flatMap((role) =>
        role.permissions.map((permission) => ({
          action: permission.action,
          resource: permission.resource,
        })),
      )

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        roles: user.roles.map((role) => role.name),
        permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    } catch (error) {
      this.logger.error(`Error finding user by id: ${id}`, error)
      throw error
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.info(`Finding user by email: ${email}`)
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              permissions: true,
            },
          },
        },
      })

      if (!user) {
        return null
      }

      // Transform the data to match our domain entity
      const permissions: Permission[] = user.roles.flatMap((role) =>
        role.permissions.map((permission) => ({
          action: permission.action,
          resource: permission.resource,
        })),
      )

      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        roles: user.roles.map((role) => role.name),
        permissions,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    } catch (error) {
      this.logger.error(`Error finding user by email: ${email}`, error)
      throw error
    }
  }

  async getUserPermissions(userId: string): Promise<Array<{ action: string; resource: string }>> {
    this.logger.info(`Getting permissions for user: ${userId}`)
    try {
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
        return []
      }

      return user.roles.flatMap((role) =>
        role.permissions.map((permission) => ({
          action: permission.action,
          resource: permission.resource,
        })),
      )
    } catch (error) {
      this.logger.error(`Error getting permissions for user: ${userId}`, error)
      throw error
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    this.logger.info(`Getting roles for user: ${userId}`)
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: true,
        },
      })

      if (!user) {
        return []
      }

      return user.roles.map((role) => role.name)
    } catch (error) {
      this.logger.error(`Error getting roles for user: ${userId}`, error)
      throw error
    }
  }
}

