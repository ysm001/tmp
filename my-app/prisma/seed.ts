import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  })

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" },
  })

  // Create permissions
  const todoPermissions = [
    { action: "create", resource: "todo" },
    { action: "read", resource: "todo" },
    { action: "update", resource: "todo" },
    { action: "delete", resource: "todo" },
  ]

  const createdPermissions = await Promise.all(
    todoPermissions.map(async (permission) => {
      return prisma.permission.upsert({
        where: {
          action_resource: {
            action: permission.action,
            resource: permission.resource,
          },
        },
        update: {},
        create: permission,
      })
    }),
  )

  // Assign all permissions to admin role
  await Promise.all(
    createdPermissions.map(async (permission) => {
      return prisma.role.update({
        where: { id: adminRole.id },
        data: {
          permissions: {
            connect: { id: permission.id },
          },
        },
      })
    }),
  )

  // Assign read and create permissions to user role
  await Promise.all(
    createdPermissions
      .filter((p) => p.action === "read" || p.action === "create")
      .map(async (permission) => {
        return prisma.role.update({
          where: { id: userRole.id },
          data: {
            permissions: {
              connect: { id: permission.id },
            },
          },
        })
      }),
  )

  // Create test users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      roles: {
        connect: { id: adminRole.id },
      },
    },
  })

  const regularUser = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      name: "Regular User",
      roles: {
        connect: { id: userRole.id },
      },
    },
  })

  console.log({ adminUser, regularUser, adminRole, userRole, permissions: createdPermissions })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

