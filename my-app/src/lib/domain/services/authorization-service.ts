export interface AuthorizationService {
  /**
   * Checks if a user has permission to perform an action
   * @param userId The ID of the user
   * @param action The action to be performed
   * @param resource The resource being accessed
   * @param resourceOwnerId The owner ID of the resource (if applicable)
   */
  hasPermission(userId: string, action: string, resource: string, resourceOwnerId?: string): Promise<boolean>

  /**
   * Checks if a user has a specific role
   * @param userId The ID of the user
   * @param role The role to check
   */
  hasRole(userId: string, role: string): Promise<boolean>

  /**
   * Checks if a user is the owner of a resource
   * @param userId The ID of the user
   * @param resourceOwnerId The owner ID of the resource
   */
  isResourceOwner(userId: string, resourceOwnerId: string): Promise<boolean>
}

