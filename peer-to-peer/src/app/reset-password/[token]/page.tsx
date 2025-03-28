"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowLeft, CheckCircle, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { resetPassword, verifyResetToken } from "@/lib/actions/auth-actions"

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams(); 
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || "";

  console.log("Reset password page loaded with token:", token)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [email, setEmail] = useState("")

  useEffect(() => {
    async function checkToken() {
      try {
        const result = await verifyResetToken(token as string)
        if (result.error) {
          setError(result.error)
          setTokenValid(false)
        } else {
          setTokenValid(true)
          setEmail(result.email || "")
        }
      } catch (err) {
        setError("Invalid or expired reset token")
        setTokenValid(false)
      } finally {
        setVerifying(false)
      }
    }

    checkToken()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      setLoading(false)
      return
    }

    try {
      const result = await resetPassword(token, password)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <Shield className="h-6 w-6" />
              <span>SecureEscrow</span>
            </Link>
          </div>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Verifying reset link</CardTitle>
              <CardDescription>Please wait while we verify your reset link...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <Shield className="h-6 w-6" />
              <span>SecureEscrow</span>
            </Link>
          </div>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
              <CardDescription>This password reset link is invalid or has expired.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || "Invalid or expired reset token"}</AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request a new reset link</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-6 w-6" />
            <span>SecureEscrow</span>
          </Link>
        </div>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              {email ? `Create a new password for ${email}` : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success ? (
                <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Password Reset Successful</AlertTitle>
                  <AlertDescription>
                    Your password has been reset successfully. You will be redirected to the login page in a few
                    seconds.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              {!success && (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              )}
              <div className="text-center text-sm">
                <Link href="/login" className="flex items-center justify-center gap-1 text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}


