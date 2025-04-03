export interface User {
  id: string
  email: string
  name?: string
  roles: string[]
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  action: string
  resource: string
}

