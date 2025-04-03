import { injectable, inject } from "inversify"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { UserRepository } from "@/lib/domain/repositories/user-repository"
import type { User } from "@/lib/domain/entities/user"
import type { AuthenticationService } from "@/lib/domain/services/authentication-service"

@injectable()
export class UserAuthenticationService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.AuthenticationService) private authenticationService: AuthenticationService
  ) {}

  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const authResult = await this.authenticationService.verifyToken(token)

      if (!authResult.isAuthenticated || !authResult.userId) {
        this.logger.warn("Token verification failed or no userId in token")
        return null
      }

      this.logger.info(`Fetching user data for userId: ${authResult.userId}`)
      const user = await this.userRepository.findById(authResult.userId)

      if (!user) {
        this.logger.warn(`User not found for userId: ${authResult.userId}`)
        return null
      }

      this.logger.info(`User data fetched successfully for: ${user.email}`)
      return user
    } catch (error) {
      this.logger.error("Error getting user from token", error)
      return null
    }
  }

  async login(email: string): Promise<{ token: string; user: User }> {
    this.logger.info("User login attempt", email)

    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new Error("User not found")
    }

    // In a real app, you would validate password here

    // Get user permissions
    const permissions = await this.userRepository.getUserPermissions(user.id)

    // Create JWT payload
    const payload = {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      permissions,
    }

    // Sign JWT token
    const token = await this.authenticationService.signToken(payload)

    return { token, user }
  }
}

