import { Container } from "inversify"
import { TYPES } from "./types"
import { type Logger, ConsoleLogger } from "@/lib/infrastructure/logger/logger"
import type { TodoRepository } from "@/lib/domain/repositories/todo-repository"
import type { UserRepository } from "@/lib/domain/repositories/user-repository"
import { PrismaTodoRepository } from "@/lib/infrastructure/repositories/prisma-todo-repository"
import { PrismaUserRepository } from "@/lib/infrastructure/repositories/prisma-user-repository"
import { TodoUseCase } from "@/lib/application/usecases/todo-usecase"
import { UserUseCase } from "@/lib/application/usecases/user-usecase"
import type { AuthorizationService } from "@/lib/domain/services/authorization-service"
import { AuthorizationServiceImpl } from "@/lib/infrastructure/auth/authorization-service-impl"
import type { AuthenticationService } from "@/lib/domain/services/authentication-service"
import { JwtAuthenticationService } from "@/lib/infrastructure/auth/jwt-authentication-service"
import { UserAuthenticationService } from "@/lib/application/services/user-authentication-service"

const container = new Container()

// Bind logger
container.bind<Logger>(TYPES.Logger).to(ConsoleLogger).inSingletonScope()

// Bind repositories
container.bind<TodoRepository>(TYPES.TodoRepository).to(PrismaTodoRepository).inSingletonScope()
container.bind<UserRepository>(TYPES.UserRepository).to(PrismaUserRepository).inSingletonScope()

// Bind services
container.bind<AuthorizationService>(TYPES.AuthorizationService).to(AuthorizationServiceImpl).inSingletonScope()
container.bind<AuthenticationService>(TYPES.AuthenticationService).to(JwtAuthenticationService).inSingletonScope()
container
  .bind<UserAuthenticationService>(TYPES.UserAuthenticationService)
  .to(UserAuthenticationService)
  .inSingletonScope()

// Bind use cases
container.bind<TodoUseCase>(TYPES.TodoUseCase).to(TodoUseCase).inSingletonScope()
container.bind<UserUseCase>(TYPES.UserUseCase).to(UserUseCase).inSingletonScope()

export { container }

