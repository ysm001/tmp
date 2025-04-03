"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "@/lib/domain/entities/user"
import { getCookie, deleteCookie } from "@/lib/utils/cookies"
import { trpc } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"
import { useLogger } from "./logger-provider"

interface SerializedUser {
  id: string
  email: string
  name?: string
  roles: string[]
  permissions: Array<{ action: string; resource: string }>
  createdAt: string
  updatedAt: string
}

interface UserContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasPermission: (action: string, resource: string) => Promise<boolean>
  hasRole: (role: string) => Promise<boolean>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasPermission: async () => false,
  hasRole: async () => false,
  logout: async () => {},
})

// Convert serialized user to User object
function deserializeUser(serializedUser: SerializedUser | null): User | null {
  if (!serializedUser) return null

  return {
    ...serializedUser,
    createdAt: new Date(serializedUser.createdAt),
    updatedAt: new Date(serializedUser.updatedAt),
  }
}

export function UserProvider({
  children,
  initialUser,
}: {
  children: ReactNode
  initialUser: SerializedUser | null
}) {
  const [user, setUser] = useState<User | null>(() => deserializeUser(initialUser))
  const [isLoading, setIsLoading] = useState(!initialUser)
  const router = useRouter()
  const logger = useLogger()

  // Get the authorization service through tRPC - only if we don't have initialUser
  const { data: userData } = trpc.auth.getUser.useQuery(undefined, {
    enabled: !initialUser && !!getCookie("auth-token"),
    retry: false,
    onError: (error) => {
      logger.error("Failed to fetch user data", error)
      setUser(null)
      setIsLoading(false)
    },
    onSuccess: (data) => {
      if (data) {
        logger.info("User data fetched successfully from client", { userId: data.id })
        setUser({
          ...data,
          permissions: [], // We don't get permissions from the query for security
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      } else {
        logger.info("No user data returned from client query")
        setUser(null)
      }
      setIsLoading(false)
    },
  })

  const checkPermissionMutation = trpc.auth.checkPermission.useMutation()
  const checkRoleMutation = trpc.auth.checkRole.useMutation()
  const logoutMutation = trpc.auth.logout.useMutation()

  useEffect(() => {
    // If we have userData from the query and no initialUser, update the user state
    if (userData && !initialUser) {
      logger.debug("Updating user state from userData", { userId: userData.id })
      setUser({
        ...userData,
        permissions: [], // We don't get permissions from the query for security
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      setIsLoading(false)
    }
  }, [userData, initialUser, logger])

  // Log initial user on mount
  useEffect(() => {
    if (initialUser) {
      logger.info("User provider initialized with server-provided user data", {
        userId: initialUser.id,
        email: initialUser.email,
      })
    } else {
      logger.info("User provider initialized without server-provided user data")
    }
  }, [initialUser, logger])

  const hasPermission = async (action: string, resource: string): Promise<boolean> => {
    if (!user) {
      logger.debug("Permission check failed: No user logged in")
      return false
    }

    try {
      logger.debug("Checking permission", { action, resource, userId: user.id })
      // Use the tRPC mutation to check permission on the server
      const result = await checkPermissionMutation.mutateAsync({
        action,
        resource,
      })

      logger.debug("Permission check result", {
        action,
        resource,
        hasPermission: result.hasPermission,
      })
      return result.hasPermission
    } catch (error) {
      logger.error("Error checking permission", { action, resource, error })
      return false
    }
  }

  const hasRole = async (role: string): Promise<boolean> => {
    if (!user) {
      logger.debug("Role check failed: No user logged in")
      return false
    }

    try {
      logger.debug("Checking role", { role, userId: user.id })
      // Use the tRPC mutation to check role on the server
      const result = await checkRoleMutation.mutateAsync({
        role,
      })

      logger.debug("Role check result", { role, hasRole: result.hasRole })
      return result.hasRole
    } catch (error) {
      logger.error("Error checking role", { role, error })
      return false
    }
  }

  const logout = async () => {
    try {
      logger.info("User logging out", { userId: user?.id })
      await logoutMutation.mutateAsync()

      // Clear cookies
      deleteCookie("auth-token")
      deleteCookie("user-id")
      deleteCookie("user-email")
      deleteCookie("user-roles")

      // Clear user state
      setUser(null)

      logger.info("User logged out successfully")

      // Redirect to login page
      router.push("/login")
      router.refresh()
    } catch (error) {
      logger.error("Logout error", error)
    }
  }

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        hasPermission,
        hasRole,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

