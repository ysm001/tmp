import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { AuthenticationService } from "@/lib/domain/services/authentication-service"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"
import type { Logger } from "@/lib/infrastructure/logger/logger"

// Define page permissions
const pagePermissions: Record<string, { action: string; resource: string }> = {
  "/": { action: "read", resource: "todo" },
  "/todos": { action: "read", resource: "todo" },
  "/todos/create": { action: "create", resource: "todo" },
  "/todos/edit": { action: "update", resource: "todo" },
  "/admin": { action: "admin", resource: "system" },
  "/admin/users": { action: "admin", resource: "user" },
}

// Public pages that don't require authentication
const publicPages = ["/login", "/register", "/about"]

export async function middleware(request: NextRequest) {
  const logger = container.get<Logger>(TYPES.Logger)
  const authenticationService = container.get<AuthenticationService>(TYPES.AuthenticationService)
  const authorizationService = container.get<AuthorizationService>(TYPES.AuthorizationService)

  // Skip middleware for static assets
  if (request.nextUrl.pathname.startsWith("/_next") || request.nextUrl.pathname.startsWith("/favicon.ico")) {
    return NextResponse.next()
  }

  // For tRPC routes
  if (request.nextUrl.pathname.startsWith("/api/trpc")) {
    try {
      // Get the token from cookie or header
      const authToken = authenticationService.getTokenFromCookieOrHeader(
        request.cookies.get("auth-token")?.value,
        request.headers.get("authorization"),
      )

      if (!authToken) {
        logger.warn("No auth token found for tRPC request")
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      // Verify the token
      const authResult = await authenticationService.verifyToken(authToken)

      if (!authResult.isAuthenticated) {
        logger.warn("Invalid token for tRPC request", { error: authResult.error })
        return NextResponse.json({ error: authResult.error || "Authentication failed" }, { status: 401 })
      }

      // Set headers for server components and tRPC context
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set("x-user-id", authResult.userId!)
      requestHeaders.set("x-user-email", authResult.email!)
      requestHeaders.set("x-user-roles", JSON.stringify(authResult.roles))
      requestHeaders.set("x-user-permissions", JSON.stringify(authResult.permissions))

      // Return the response with modified request headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      logger.error("Authorization middleware error for tRPC:", error)
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
  }

  // For page routes
  try {
    // Check if the page is public
    if (publicPages.some((page) => request.nextUrl.pathname.startsWith(page))) {
      logger.debug(`Allowing access to public page: ${request.nextUrl.pathname}`)
      return NextResponse.next()
    }

    // Get the authorization cookie
    const authToken = request.cookies.get("auth-token")?.value

    if (!authToken) {
      logger.info(`Redirecting to login: No auth token for ${request.nextUrl.pathname}`)
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Verify the token
    const authResult = await authenticationService.verifyToken(authToken)

    if (!authResult.isAuthenticated) {
      logger.warn(`Invalid token for page request: ${request.nextUrl.pathname}`, { error: authResult.error })
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check page permissions
    const requiredPermission = pagePermissions[request.nextUrl.pathname]

    if (requiredPermission) {
      const { action, resource } = requiredPermission

      // Use AuthorizationService to check permission
      const hasPermission = await authorizationService.hasPermission(authResult.userId!, action, resource)

      if (!hasPermission) {
        logger.warn(`User ${authResult.userId} attempted to access ${request.nextUrl.pathname} without permission`)
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
    }

    // Create a response
    const response = NextResponse.next()

    // Set user information in cookies for client-side access
    response.cookies.set("user-id", authResult.userId!, {
      httpOnly: false,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    })

    response.cookies.set("user-email", authResult.email!, {
      httpOnly: false,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    })

    response.cookies.set("user-roles", JSON.stringify(authResult.roles), {
      httpOnly: false,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    })

    // Set headers for server components
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", authResult.userId!)
    requestHeaders.set("x-user-email", authResult.email!)
    requestHeaders.set("x-user-roles", JSON.stringify(authResult.roles))

    // Return the response with modified request headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
      response,
    })
  } catch (error) {
    logger.error("Authorization middleware error for page:", error)

    // Redirect to login if authentication fails
    if (!publicPages.some((page) => request.nextUrl.pathname.startsWith(page))) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Allow access to public pages
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

