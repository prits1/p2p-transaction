"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check, Trash2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/actions/notification-actions"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const result = await getNotifications()

      if (result.error) {
        setError(result.error)
      } else {
        setNotifications(result.notifications)
      }
    } catch (err: any) {
      setError(err.message || "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)))
    } catch (err: any) {
      setError(err.message || "Failed to mark notification as read")
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch (err: any) {
      setError(err.message || "Failed to mark all notifications as read")
    }
  }

  async function handleDeleteNotification(id: string) {
    try {
      const result = await deleteNotification(id)
      if (result.error) {
        setError(result.error)
        return
      }
      setNotifications((prev) => prev.filter((n) => n._id !== id))
    } catch (err: any) {
      setError(err.message || "Failed to delete notification")
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-5 w-5 text-green-500" />
      case "warning":
        return <Bell className="h-5 w-5 text-amber-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getRelatedLink = (notification: any) => {
    if (!notification.relatedTo) return null

    switch (notification.relatedTo.type) {
      case "transaction":
        return `/dashboard/transactions/${notification.relatedTo.id}`
      case "dispute":
        return `/dashboard/disputes/${notification.relatedTo.id}`
      case "message":
        return `/dashboard/messages/${notification.relatedTo.id}`
      default:
        return null
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Notifications" text="Stay updated with your transaction activities.">
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </DashboardHeader>

      {error && <div className="bg-destructive/15 p-4 rounded-md text-sm text-destructive mb-4">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>Recent updates and alerts related to your transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">You don't have any notifications yet</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    !notification.isRead ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${!notification.isRead ? "text-primary" : ""}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    {getRelatedLink(notification) ? (
                      <Link href={getRelatedLink(notification)!} className="text-sm text-primary hover:underline">
                        View details
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMarkAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Mark as read</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteNotification(notification._id)}
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  )
}







