"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getNotifications } from "@/lib/actions/notification-actions"
import { getUnreadMessages } from "@/lib/actions/message-actions"
import { getTransactions } from "@/lib/actions/transaction-actions"
import { getDisputes } from "@/lib/actions/dispute-actions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NotificationIndicator() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [hasPendingTransactions, setHasPendingTransactions] = useState(false)
  const [hasActiveDisputes, setHasActiveDisputes] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotificationData() {
      try {
        // Get notifications
        const notificationsResult = await getNotifications()
        if (notificationsResult.success) {
          const unread = notificationsResult.notifications.filter((n: any) => !n.isRead).length
          setUnreadCount(unread)
          setNotifications(notificationsResult.notifications.slice(0, 5)) // Get latest 5 notifications
        }

        // Check for unread messages
        const messagesResult = await getUnreadMessages()
        if (messagesResult.success) {
          setHasUnreadMessages(messagesResult.unreadCount > 0)
        }

        // Check for pending transactions
        const transactionsResult = await getTransactions()
        if (transactionsResult.success) {
          const pendingTransactions = transactionsResult.transactions.filter((t: any) => t.status === "pending")
          setHasPendingTransactions(pendingTransactions.length > 0)
        }

        // Check for active disputes
        const disputesResult = await getDisputes()
        if (disputesResult.success) {
          const activeDisputes = disputesResult.disputes.filter(
            (d: any) => d.status === "open" || d.status === "under_review",
          )
          setHasActiveDisputes(activeDisputes.length > 0)
        }
      } catch (err) {
        console.error("Failed to load notification data:", err)
      } finally {
        setLoading(false)
      }
    }

    loadNotificationData()

    // Poll for new notifications every minute
    const interval = setInterval(loadNotificationData, 60000)

    return () => clearInterval(interval)
  }, [])

  // Calculate if we need to show the red dot indicator
  const showRedDot = unreadCount > 0 || hasUnreadMessages || hasPendingTransactions || hasActiveDisputes

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {showRedDot && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
              {unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : "•"}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} unread</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Alert indicators */}
        {(hasUnreadMessages || hasPendingTransactions || hasActiveDisputes) && (
          <DropdownMenuGroup className="p-2 space-y-1">
            {hasUnreadMessages && (
              <Link href="/dashboard/messages" className="block">
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                  <span className="h-2 w-2 rounded-full bg-destructive"></span>
                  <span className="text-sm">You have unread messages</span>
                </div>
              </Link>
            )}

            {hasPendingTransactions && (
              <Link href="/dashboard/transactions" className="block">
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                  <span className="h-2 w-2 rounded-full bg-destructive"></span>
                  <span className="text-sm">You have pending transactions</span>
                </div>
              </Link>
            )}

            {hasActiveDisputes && (
              <Link href="/dashboard/disputes" className="block">
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                  <span className="h-2 w-2 rounded-full bg-destructive"></span>
                  <span className="text-sm">You have active disputes</span>
                </div>
              </Link>
            )}
          </DropdownMenuGroup>
        )}

        {(hasUnreadMessages || hasPendingTransactions || hasActiveDisputes) && <DropdownMenuSeparator />}

        <DropdownMenuGroup className="max-h-[300px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification._id} asChild>
                <Link
                  href={
                    notification.relatedTo
                      ? `/dashboard/${notification.relatedTo.type}s/${notification.relatedTo.id}`
                      : "/dashboard/notifications"
                  }
                  className="flex cursor-pointer flex-col gap-1 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${!notification.isRead ? "text-primary" : ""}`}>
                      {notification.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notifications" className="flex w-full cursor-pointer justify-center">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}







