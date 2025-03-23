"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createLogger } from "@/lib/logger"

const logger = createLogger("ErrorBoundary")

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null)

  useEffect(() => {
    // Add global error handler for unhandled errors
    const errorHandler = (event: ErrorEvent) => {
      logger.error("Unhandled error:", {
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      })
      setError(event.error)
    }

    // Add global promise rejection handler
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      logger.error("Unhandled promise rejection:", {
        reason: event.reason,
        stack: event.reason?.stack,
      })
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)))
    }

    window.addEventListener("error", errorHandler)
    window.addEventListener("unhandledrejection", rejectionHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
      window.removeEventListener("unhandledrejection", rejectionHandler)
    }
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>We've encountered an unexpected error. Our team has been notified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">{error.message || "Unknown error"}</p>
              {process.env.NODE_ENV === "development" && error.stack && (
                <pre className="mt-2 max-h-40 overflow-auto text-xs text-destructive/80">{error.stack}</pre>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

