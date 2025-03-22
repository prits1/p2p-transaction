"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Key, Save, Trash2, User } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getCurrentUser, signOut } from "@/lib/actions/auth-actions"
import { updateUserProfile, changePassword, deleteAccount } from "@/lib/actions/user-actions"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [formLoading, setFormLoading] = useState({
    profile: false,
    password: false,
    delete: false,
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser()
        if (userData) {
          setUser(userData)
        } else {
          router.push("/login")
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  async function handleUpdateProfile(formData: FormData) {
    setError(null)
    setSuccess(null)
    setFormLoading((prev) => ({ ...prev, profile: true }))

    try {
      const result = await updateUserProfile(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess("Profile updated successfully")
        // Refresh user data
        const userData = await getCurrentUser()
        if (userData) {
          setUser(userData)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setFormLoading((prev) => ({ ...prev, profile: false }))
    }
  }

  async function handleChangePassword(formData: FormData) {
    setError(null)
    setSuccess(null)
    setFormLoading((prev) => ({ ...prev, password: true }))

    try {
      const result = await changePassword(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess("Password changed successfully")
        // Reset form
        const form = document.getElementById("password-form") as HTMLFormElement
        form.reset()
      }
    } catch (err: any) {
      setError(err.message || "Failed to change password")
    } finally {
      setFormLoading((prev) => ({ ...prev, password: false }))
    }
  }

  async function handleDeleteAccount(formData: FormData) {
    setError(null)
    setFormLoading((prev) => ({ ...prev, delete: true }))

    try {
      const result = await deleteAccount(formData)

      if (result.error) {
        setError(result.error)
      } else {
        await signOut() // This will redirect to login page
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete account")
    } finally {
      setFormLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Settings" text="Loading your settings..." />
        <div className="flex items-center justify-center p-8">
          <p>Loading user data...</p>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Account Settings" text="Manage your account settings and preferences." />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-700 border-green-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <form action={handleUpdateProfile}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>Update your account profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" defaultValue={user?.name || ""} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" defaultValue={user?.email || ""} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Account Type</Label>
                  <Input id="role" value={user?.role === "buyer" ? "Buyer" : "Seller"} disabled />
                  <p className="text-xs text-muted-foreground">Account type cannot be changed</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="gap-2" disabled={formLoading.profile}>
                  <Save className="h-4 w-4" />
                  {formLoading.profile ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <form id="password-form" action={handleChangePassword}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <CardTitle>Change Password</CardTitle>
                </div>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" name="currentPassword" type="password" required />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" name="newPassword" type="password" required />
                  <p className="text-xs text-muted-foreground">Password must be at least 8 characters long</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" required />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="gap-2" disabled={formLoading.password}>
                  <Key className="h-4 w-4" />
                  {formLoading.password ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/50">
            <form action={handleDeleteAccount}>
              <CardHeader className="text-destructive">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  <CardTitle>Delete Account</CardTitle>
                </div>
                <CardDescription className="text-destructive/80">
                  Permanently delete your account and all your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    This action is irreversible. All your data will be permanently deleted. You cannot delete your
                    account if you have active transactions.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-destructive">
                    Enter Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="border-destructive/50 focus-visible:ring-destructive"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation" className="text-destructive">
                    Type DELETE to confirm
                  </Label>
                  <Input
                    id="confirmation"
                    name="confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    required
                    className="border-destructive/50 focus-visible:ring-destructive"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  variant="destructive"
                  className="gap-2"
                  disabled={deleteConfirmation !== "DELETE" || formLoading.delete}
                >
                  <Trash2 className="h-4 w-4" />
                  {formLoading.delete ? "Deleting..." : "Delete Account"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

