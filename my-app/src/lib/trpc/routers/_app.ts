import { router } from "@/lib/trpc/server"
import { todoRouter } from "./todo-router"
import { authRouter } from "./auth-router"

export const appRouter = router({
  todo: todoRouter,
  auth: authRouter,
})

export type AppRouter = typeof appRouter

