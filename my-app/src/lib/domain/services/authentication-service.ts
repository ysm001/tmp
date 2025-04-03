export interface TokenPayload {
  userId: string
  email: string
  roles?: string[]
  permissions?: Array<{
    action: string
    resource: string
  }>
}

export interface AuthenticationResult {
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

export interface AuthenticationService {
  /**
   * Verifies a JWT token and returns the decoded payload
   * @param token The JWT token to verify
   */
  verifyToken(token: string): Promise<AuthenticationResult>

  /**
   * Signs a new JWT token with the provided payload
   * @param payload The data to include in the token
   */
  signToken(payload: Omit<TokenPayload, "exp">): Promise<string>

  /**
   * Extracts a token from an Authorization header
   * @param authHeader The Authorization header value
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null

  /**
   * Gets a token from either a cookie or an Authorization header
   * @param cookieValue The cookie value
   * @param authHeader The Authorization header value
   */
  getTokenFromCookieOrHeader(cookieValue: string | undefined, authHeader: string | undefined): string | null
}

