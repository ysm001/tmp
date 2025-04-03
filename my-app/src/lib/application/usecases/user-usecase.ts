import { injectable, inject } from "inversify"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { UserRepository } from "@/lib/domain/repositories/user-repository"
import type { User } from "@/lib/domain/entities/user"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { UserAuthenticationService } from "@/lib/application/services/user-authentication-service"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"

@injectable()
export class UserUseCase {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.UserAuthenticationService) private userAuthenticationService: UserAuthenticationService,
    @inject(TYPES.AuthorizationService) private authorizationService: AuthorizationService
  ) {}

  async getUserById(id: string): Promise<User | null> {
    this.logger.info("Getting user by id", id)
    return this.userRepository.findById(id)
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.logger.info("Getting user by email", email)
    return this.userRepository.findByEmail(email)
  }

  async login(email: string): Promise<{ token: string; user: User }> {
    return this.userAuthenticationService.login(email)
  }

  async getUserFromToken(token: string): Promise<User | null> {
    return this.userAuthenticationService.getUserFromToken(token)
  }

  async getUserPermissions(userId: string): Promise<Array<{ action: string; resource: string }>> {
    this.logger.info("Getting user permissions", userId)
    return this.userRepository.getUserPermissions(userId)
  }

  async getUserRoles(userId: string): Promise<string[]> {
    this.logger.info("Getting user roles", userId)
    return this.userRepository.getUserRoles(userId)
  }

  async hasPermission(userId: string, action: string, resource: string): Promise<boolean> {
    return this.authorizationService.hasPermission(userId, action, resource)
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    return this.authorizationService.hasRole(userId, role)
  }
}

