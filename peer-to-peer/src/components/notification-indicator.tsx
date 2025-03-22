"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getNotifications } from "@/lib/actions/notification-actions"

export function NotificationIndicator() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadNotifications() {
      try {
        const result = await getNotifications()

        if (result.success) {
          const unread = result.notifications.filter((n: any) => !n.isRead).length
          setUnreadCount(unread)
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()

    // Poll for new notifications every minute
    const interval = setInterval(loadNotifications, 60000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Link href="/dashboard/notifications">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    </Link>
  )
}

