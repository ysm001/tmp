"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/components/providers/user-provider"
import { useLogger } from "@/components/providers/logger-provider"
import { trpc } from "@/lib/trpc/client"

export default function TodoApp() {
  const [newTodoText, setNewTodoText] = useState("")
  const [canCreate, setCanCreate] = useState(false)
  const [canUpdate, setCanUpdate] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const { toast } = useToast()
  const { user, isAuthenticated, hasPermission } = useUser()
  const logger = useLogger()

  // tRPC queries and mutations
  const utils = trpc.useContext()

  const { data: todos = [], isLoading } = trpc.todo.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
    onError: (error) => {
      logger.error("Failed to fetch todos", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch todos",
        variant: "destructive",
      })
    },
    onSuccess: (data) => {
      logger.info("Todos fetched successfully", { count: data.length })
    },
  })

  const createTodoMutation = trpc.todo.create.useMutation({
    onSuccess: (newTodo) => {
      logger.info("Todo created successfully", { todoId: newTodo.id })
      utils.todo.getAll.invalidate()
      setNewTodoText("")
      toast({
        title: "Success",
        description: "Todo added successfully",
      })
    },
    onError: (error) => {
      logger.error("Failed to create todo", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add todo",
        variant: "destructive",
      })
    },
  })

  const updateTodoMutation = trpc.todo.update.useMutation({
    onSuccess: (updatedTodo) => {
      logger.info("Todo updated successfully", { todoId: updatedTodo.id })
      utils.todo.getAll.invalidate()
    },
    onError: (error) => {
      logger.error("Failed to update todo", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update todo",
        variant: "destructive",
      })
    },
  })

  const deleteTodoMutation = trpc.todo.delete.useMutation({
    onSuccess: (_, variables) => {
      logger.info("Todo deleted successfully", { todoId: variables.id })
      utils.todo.getAll.invalidate()
      toast({
        title: "Success",
        description: "Todo deleted successfully",
      })
    },
    onError: (error) => {
      logger.error("Failed to delete todo", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete todo",
        variant: "destructive",
      })
    },
  })

  // Check permissions when user changes
  useEffect(() => {
    const checkPermissions = async () => {
      if (isAuthenticated) {
        logger.debug("Checking todo permissions")
        const [createPerm, updatePerm, deletePerm] = await Promise.all([
          hasPermission("create", "todo"),
          hasPermission("update", "todo"),
          hasPermission("delete", "todo"),
        ])

        logger.debug("Permission check results", {
          create: createPerm,
          update: updatePerm,
          delete: deletePerm,
        })

        setCanCreate(createPerm)
        setCanUpdate(updatePerm)
        setCanDelete(deletePerm)
      }
    }

    checkPermissions()
  }, [isAuthenticated, hasPermission, logger])

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodoText.trim()) return

    logger.info("Creating new todo", { title: newTodoText })
    createTodoMutation.mutate({
      title: newTodoText,
      completed: false,
    })
  }

  const handleToggleTodo = (id: string, completed: boolean) => {
    logger.info("Toggling todo completion", { todoId: id, currentStatus: completed })
    updateTodoMutation.mutate({
      id,
      data: { completed: !completed },
    })
  }

  const handleDeleteTodo = (id: string) => {
    logger.info("Deleting todo", { todoId: id })
    deleteTodoMutation.mutate({ id })
  }

  if (!isAuthenticated) {
    logger.debug("User not authenticated, showing login prompt")
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Todo App</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">Please log in to access your todos.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Todo App</CardTitle>
        {user && <p className="text-center text-sm text-muted-foreground">Logged in as {user.email}</p>}
      </CardHeader>
      <CardContent>
        {canCreate && (
          <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Add a new todo..."
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={createTodoMutation.isLoading}>
              {createTodoMutation.isLoading ? "Adding..." : "Add"}
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : todos.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No todos yet. Add one above!</div>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  {canUpdate ? (
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => handleToggleTodo(todo.id, todo.completed)}
                      disabled={updateTodoMutation.isLoading}
                    />
                  ) : (
                    <div className={`w-4 h-4 rounded-sm border ${todo.completed ? "bg-primary" : ""}`} />
                  )}
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`${todo.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {todo.title}
                  </label>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTodo(todo.id)}
                    disabled={deleteTodoMutation.isLoading}
                    aria-label="Delete todo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

