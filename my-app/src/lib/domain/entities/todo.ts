export interface Todo {
  id: string
  title: string
  completed: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTodoDTO {
  title: string
  completed?: boolean
}

export interface UpdateTodoDTO {
  title?: string
  completed?: boolean
}

