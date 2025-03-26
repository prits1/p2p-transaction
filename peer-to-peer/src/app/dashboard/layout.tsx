"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CreditCard,
  Home,
  LogOut,
  Settings,
  Shield,
  ShoppingCart,
  User,
  ChevronRight,
  BarChart3,
  HelpCircle,
  ShieldAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { NotificationIndicator } from "@/components/notification-indicator"
import { getCurrentUser, signOut } from "@/lib/actions/auth-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { getDisputes } from "@/lib/actions/dispute-actions"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasActiveDisputes, setHasActiveDisputes] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getCurrentUser()
        if (userData) {
          console.log("User data loaded:", userData)
          setUser(userData)

          // Check for active disputes
          const disputesResult = await getDisputes()
          if (disputesResult.success) {
            const activeDisputes = disputesResult.disputes.filter(
              (d: any) => d.status === "open" || d.status === "under_review",
            )
            setHasActiveDisputes(activeDisputes.length > 0)
          }
        } else {
          console.log("No user data found, redirecting to login")
          // If no user is found, redirect to login
          router.push("/login")
        }
      } catch (err) {
        console.error("Failed to load user data:", err)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login via the useEffect
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-muted/30">
        <Sidebar variant="inset" className="border-r">
          <SidebarHeader className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg">SecureEscrow</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <Home className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/dashboard/transactions")}>
                  <Link href="/dashboard/transactions">
                    <ShoppingCart className="h-5 w-5" />
                    <span>Transactions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/dashboard/disputes")}>
                  <Link href="/dashboard/disputes">
                    <div className="relative">
                      <ShieldAlert className="h-5 w-5" />
                      {hasActiveDisputes && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive"></span>
                      )}
                    </div>
                    <span>Disputes</span>
                    {hasActiveDisputes && (
                      <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        New
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/dashboard/wallet")}>
                  <Link href="/dashboard/wallet">
                    <CreditCard className="h-5 w-5" />
                    <span>Wallet</span>
                    {user.walletBalance > 0 && (
                      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        ${user.walletBalance.toFixed(2)}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/dashboard/analytics")}>
                  <Link href="/dashboard/analytics">
                    <BarChart3 className="h-5 w-5" />
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/dashboard/settings")}>
                  <Link href="/dashboard/settings">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="mt-6 px-3">
              <div className="rounded-lg bg-primary/10 p-4">
                <h3 className="flex items-center gap-2 font-medium text-primary">
                  <HelpCircle className="h-4 w-4" />
                  Need Help?
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Our support team is available 24/7 to assist you with any questions.
                </p>
                <Button size="sm" variant="outline" className="mt-3 w-full">
                  Contact Support
                </Button>
              </div>
            </div>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-sm">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/wallet">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Wallet</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/notifications">
                    <span>Notifications</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold">
                  {pathname === "/dashboard" && "Dashboard"}
                  {pathname.includes("/dashboard/transactions") && "Transactions"}
                  {pathname.includes("/dashboard/disputes") && "Disputes"}
                  {pathname.includes("/dashboard/wallet") && "Wallet"}
                  {pathname.includes("/dashboard/settings") && "Settings"}
                  {pathname.includes("/dashboard/notifications") && "Notifications"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationIndicator />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}

