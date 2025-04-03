import { PrismaClient } from "@prisma/client"
import { injectable, inject } from "inversify"
import type { TodoRepository } from "@/lib/domain/repositories/todo-repository"
import type { Todo, CreateTodoDTO, UpdateTodoDTO } from "@/lib/domain/entities/todo"
import type { Logger } from "@/lib/infrastructure/logger/logger"
import { TYPES } from "@/lib/infrastructure/di/types"

@injectable()
export class PrismaTodoRepository implements TodoRepository {
  private prisma: PrismaClient;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.prisma = new PrismaClient()
  }

  async findAll(userId: string): Promise<Todo[]> {
    this.logger.info(`Finding all todos for user: ${userId}`)
    const todos = await this.prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    return todos as Todo[]
  }

  async findById(id: string, userId: string): Promise<Todo | null> {
    this.logger.info(`Finding todo by id: ${id} for user: ${userId}`)
    const todo = await this.prisma.todo.findFirst({
      where: { id, userId },
    })
    return todo as Todo | null
  }

  async create(data: CreateTodoDTO, userId: string): Promise<Todo> {
    this.logger.info(`Creating todo for user: ${userId}`)
    const todo = await this.prisma.todo.create({
      data: {
        ...data,
        userId,
      },
    })
    return todo as Todo
  }

  async update(id: string, data: UpdateTodoDTO, userId: string): Promise<Todo> {
    this.logger.info(`Updating todo: ${id} for user: ${userId}`)
    const todo = await this.prisma.todo.update({
      where: { id, userId },
      data,
    })
    return todo as Todo
  }

  async delete(id: string, userId: string): Promise<void> {
    this.logger.info(`Deleting todo: ${id} for user: ${userId}`)
    await this.prisma.todo.delete({
      where: { id, userId },
    })
  }
}

