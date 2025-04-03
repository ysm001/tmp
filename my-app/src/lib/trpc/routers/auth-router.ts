import { z } from "zod"
import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/server"
import { container } from "@/lib/infrastructure/di/container"
import { TYPES } from "@/lib/infrastructure/di/types"
import type { UserUseCase } from "@/lib/application/usecases/user-usecase"

const userUseCase = container.get<UserUseCase>(TYPES.UserUseCase)

export const authRouter = router({
  login: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ ctx, input }) => {
    ctx.logger.info("tRPC: User login attempt", input.email)

    try {
      const { token, user } = await userUseCase.login(input.email)

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      }
    } catch (error: any) {
      ctx.logger.error("Login error", error)
      throw new Error(error.message || "Login failed")
    }
  }),

  getUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return null
    }

    ctx.logger.info(`tRPC: Getting user data for userId: ${ctx.userId}`)
    const user = await userUseCase.getUserById(ctx.userId)

    if (!user) {
      ctx.logger.warn(`User not found for userId: ${ctx.userId}`)
      return null
    }

    ctx.logger.info(`User data fetched successfully for: ${user.email}`)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    }
  }),

  checkPermission: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        resource: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        return { hasPermission: false }
      }

      ctx.logger.debug(`Checking permission for user ${ctx.userId}`, input)
      const hasPermission = await userUseCase.hasPermission(ctx.userId, input.action, input.resource)

      return { hasPermission }
    }),

  checkRole: protectedProcedure
    .input(
      z.object({
        role: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        return { hasRole: false }
      }

      ctx.logger.debug(`Checking role for user ${ctx.userId}`, input)
      const hasRole = await userUseCase.hasRole(ctx.userId, input.role)

      return { hasRole }
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    ctx.logger.info(`User logging out: ${ctx.userId}`)
    return { success: true }
  }),
})

