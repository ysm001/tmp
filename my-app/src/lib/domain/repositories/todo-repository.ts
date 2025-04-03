import type { Todo, CreateTodoDTO, UpdateTodoDTO } from "../entities/todo"

export interface TodoRepository {
  findAll(userId: string): Promise<Todo[]>
  findById(id: string, userId: string): Promise<Todo | null>
  create(data: CreateTodoDTO, userId: string): Promise<Todo>
  update(id: string, data: UpdateTodoDTO, userId: string): Promise<Todo>
  delete(id: string, userId: string): Promise<void>
}

