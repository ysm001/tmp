import { z } from "zod"
import { router, protectedProcedure, createAuthMiddleware } from "@/lib/trpc/server"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { TodoUseCase } from "@/lib/application/usecases/todo-usecase"

const todoUseCase = container.get<TodoUseCase>(TYPES.TodoUseCase)

// Define the input schema for todo operations
const todoIdSchema = z.object({ id: z.string() })
const createTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
})
const updateTodoSchema = z.object({
  id: z.string(),
  data: z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
  }),
})

export const todoRouter = router({
  getAll: protectedProcedure.use(createAuthMiddleware.hasPermission("read", "todo")).query(async ({ ctx }) => {
    ctx.logger.info("tRPC: Getting all todos")
    return todoUseCase.getAllTodos(ctx.userId)
  }),

  getById: protectedProcedure
    .input(todoIdSchema)
    .use(createAuthMiddleware.hasPermission("read", "todo"))
    .use(
      createAuthMiddleware.isResourceOwner(async (input) => {
        const todo = await todoUseCase.getTodoById(input.id, undefined as any)
        return todo?.userId
      }),
    )
    .query(async ({ ctx, input }) => {
      ctx.logger.info(`tRPC: Getting todo by id: ${input.id}`)
      const todo = await todoUseCase.getTodoById(input.id, ctx.userId)

      if (!todo) {
        throw new Error("Todo not found")
      }

      return todo
    }),

  create: protectedProcedure
    .input(createTodoSchema)
    .use(createAuthMiddleware.hasPermission("create", "todo"))
    .mutation(async ({ ctx, input }) => {
      ctx.logger.info("tRPC: Creating new todo")
      return todoUseCase.createTodo(input, ctx.userId)
    }),

  update: protectedProcedure
    .input(updateTodoSchema)
    .use(createAuthMiddleware.hasPermission("update", "todo"))
    .use(
      createAuthMiddleware.isResourceOwner(async (input) => {
        const todo = await todoUseCase.getTodoById(input.id, undefined as any)
        return todo?.userId
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ctx.logger.info(`tRPC: Updating todo: ${input.id}`)
      return todoUseCase.updateTodo(input.id, input.data, ctx.userId)
    }),

  delete: protectedProcedure
    .input(todoIdSchema)
    .use(createAuthMiddleware.hasPermission("delete", "todo"))
    .use(
      createAuthMiddleware.isResourceOwner(async (input) => {
        const todo = await todoUseCase.getTodoById(input.id, undefined as any)
        return todo?.userId
      }),
    )
    .mutation(async ({ ctx, input }) => {
      ctx.logger.info(`tRPC: Deleting todo: ${input.id}`)
      await todoUseCase.deleteTodo(input.id, ctx.userId)
      return { success: true }
    }),
})

