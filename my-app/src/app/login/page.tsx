"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useLogger } from "@/components/providers/logger-provider"
import { trpc } from "@/lib/trpc/client"
import { setCookie } from "@/lib/utils/cookies"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const logger = useLogger()

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Set auth token in cookie
      setCookie("auth-token", data.token)

      logger.info("User logged in successfully", { email })

      toast({
        title: "Success",
        description: "Logged in successfully",
      })

      // Redirect to home page
      router.push("/")
      router.refresh()
    },
    onError: (error) => {
      logger.error("Login failed", { email, error })

      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      logger.warn("Login attempt with empty email")

      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    logger.info("Attempting login", { email })
    loginMutation.mutate({ email })
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Enter your email to sign in to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">For demo purposes, any email will work</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loginMutation.isLoading}>
              {loginMutation.isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

