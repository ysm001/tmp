import type { User } from "../entities/user"

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  getUserPermissions(userId: string): Promise<Array<{ action: string; resource: string }>>
  getUserRoles(userId: string): Promise<string[]>
}

