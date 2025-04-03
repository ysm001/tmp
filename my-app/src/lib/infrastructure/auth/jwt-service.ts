import { jwtVerify, SignJWT } from "jose"
import { injectable, inject } from "inversify"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { Logger } from "@/lib/infrastructure/logger/logger"

export interface DecodedToken {
  userId: string
  email: string
  roles?: string[]
  permissions?: Array<{
    action: string
    resource: string
  }>
}

@injectable()
export class JwtService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async verifyToken(token: string): Promise<DecodedToken> {
    try {
      const secretKey = new TextEncoder().encode(process.env.JWT_SECRET as string)
      const { payload } = await jwtVerify<DecodedToken>(token, secretKey, {
        algorithms: ["HS256"],
      })
      return payload
    } catch (error) {
      this.logger.error("JWT verification failed", error)
      throw new Error("Invalid token")
    }
  }

  async signToken(payload: Omit<DecodedToken, "exp">): Promise<string> {
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

  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error("No authorization header provided")
    }

    const [type, token] = authHeader.split(" ")

    if (type !== "Bearer") {
      throw new Error("Invalid token type")
    }

    return token
  }
}

