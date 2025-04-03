import { injectable, inject } from "inversify"
import { jwtVerify, SignJWT } from "jose"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { UserRepository } from "@/lib/domain/repositories/user-repository"
import type { User } from "@/lib/domain/entities/user"

export interface TokenPayload {
  userId: string
  email: string
  roles?: string[]
  permissions?: Array<{
    action: string
    resource: string
  }>
}

export interface AuthResult {
  isAuthenticated: boolean
  userId?: string
  email?: string
  roles?: string[]
  permissions?: Array<{
    action: string
    resource: string
  }>
  error?: string
}

@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.UserRepository) private userRepository: UserRepository
  ) {}

  async verifyToken(token: string): Promise<AuthResult> {
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET as string)
      const { payload } = await jwtVerify<TokenPayload>(token, secretKey, {
        algorithms: ["HS256"],
      })

      this.logger.info(`Token verified successfully for user: ${payload.userId}`)

      return {
        isAuthenticated: true,
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
      }
    } catch (error) {
      this.logger.error("JWT verification failed", error)
      return {
        isAuthenticated: false,
        error: "Invalid or expired token",
      }
    }
  }

  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const authResult = await this.verifyToken(token)

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

  async signToken(payload: Omit<TokenPayload, "exp">): Promise<string> {
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET as string)
      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secretKey)
      return token
    } catch (error) {
      this.logger.error("JWT signing failed", error)
      throw new Error("Failed to create token")
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null
    }

    const [type, token] = authHeader.split(" ")

    if (type !== "Bearer" || !token) {
      return null
    }

    return token
  }

  getTokenFromCookieOrHeader(cookieValue: string | undefined, authHeader: string | undefined): string | null {
    // First try from cookie
    if (cookieValue) {
      return cookieValue
    }

    // Then try from auth header
    return this.extractTokenFromHeader(authHeader)
  }
}

