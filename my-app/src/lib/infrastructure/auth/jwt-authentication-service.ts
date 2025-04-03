import { injectable, inject } from "inversify"
import { jwtVerify, SignJWT } from "jose"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type {
  AuthenticationService,
  TokenPayload,
  AuthenticationResult,
} from "@/lib/domain/services/authentication-service"

@injectable()
export class JwtAuthenticationService implements AuthenticationService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async verifyToken(token: string): Promise<AuthenticationResult> {
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

