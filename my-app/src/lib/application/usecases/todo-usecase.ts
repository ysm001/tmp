import { injectable, inject } from "inversify"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { TodoRepository } from "@/lib/domain/repositories/todo-repository"
import type { Todo, CreateTodoDTO, UpdateTodoDTO } from "@/lib/domain/entities/todo"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"

@injectable()
export class TodoUseCase {
  constructor(
    @inject(TYPES.TodoRepository) private todoRepository: TodoRepository,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.AuthorizationService) private authorizationService: AuthorizationService
  ) {}

  async getAllTodos(userId: string): Promise<Todo[]> {
    this.logger.info("Getting all todos for user", userId)
    return this.todoRepository.findAll(userId)
  }

  async getTodoById(id: string, userId: string): Promise<Todo | null> {
    this.logger.info("Getting todo by id", id)
    const todo = await this.todoRepository.findById(id, userId)

    // Additional authorization check
    if (todo && todo.userId !== userId) {
      const hasPermission = await this.authorizationService.hasPermission(userId, "read", "todo", todo.userId)

      if (!hasPermission) {
        this.logger.warn(`User ${userId} attempted to access todo ${id} owned by ${todo.userId}`)
        return null
      }
    }

    return todo
  }

  async createTodo(data: CreateTodoDTO, userId: string): Promise<Todo> {
    this.logger.info("Creating new todo")
    return this.todoRepository.create(data, userId)
  }

  async updateTodo(id: string, data: UpdateTodoDTO, userId: string): Promise<Todo> {
    this.logger.info("Updating todo", id)
    const todo = await this.todoRepository.findById(id, userId)

    if (!todo) {
      throw new Error("Todo not found")
    }

    // Additional authorization check
    if (todo.userId !== userId) {
      const hasPermission = await this.authorizationService.hasPermission(userId, "update", "todo", todo.userId)

      if (!hasPermission) {
        this.logger.warn(`User ${userId} attempted to update todo ${id} owned by ${todo.userId}`)
        throw new Error("You do not have permission to update this todo")
      }
    }

    return this.todoRepository.update(id, data, userId)
  }

  async deleteTodo(id: string, userId: string): Promise<void> {
    this.logger.info("Deleting todo", id)
    const todo = await this.todoRepository.findById(id, userId)

    if (!todo) {
      throw new Error("Todo not found")
    }

    // Additional authorization check
    if (todo.userId !== userId) {
      const hasPermission = await this.authorizationService.hasPermission(userId, "delete", "todo", todo.userId)

      if (!hasPermission) {
        this.logger.warn(`User ${userId} attempted to delete todo ${id} owned by ${todo.userId}`)
        throw new Error("You do not have permission to delete this todo")
      }
    }

    return this.todoRepository.delete(id, userId)
  }
}

