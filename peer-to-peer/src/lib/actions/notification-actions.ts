"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

import { getCollection } from "@/lib/db"
import type { Notification } from "@/lib/models"
import { getCurrentUser } from "./auth-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("notification-actions")

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  relatedTo,
}: {
  userId: string
  title: string
  message: string
  type?: "info" | "success" | "warning" | "error"
  relatedTo?: {
    type: "transaction" | "dispute" | "message" | "system"
    id: string
  }
}) {
  try {
    const usersCollection = await getCollection("users")

    const notification: Notification = {
      userId: new ObjectId(userId),
      title,
      message,
      type,
      relatedTo,
      isRead: false,
      createdAt: new Date(),
    }

    // Add notification to user document
    await usersCollection.updateOne({ _id: new ObjectId(userId) }, { push: { notifications: notification } })

    logger.info("Notification created", { userId, title })
    return { success: true }
  } catch (error: any) {
    logger.error("Failed to create notification", error)
    return { error: error.message || "Failed to create notification" }
  }
}

export async function getNotifications() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const usersCollection = await getCollection("users")

    const user = await usersCollection.findOne(
      { _id: new ObjectId(currentUser.userId) },
      { projection: { notifications: 1 } },
    )

    if (!user || !user.notifications) {
      return { success: true, notifications: [] }
    }

    // Sort notifications by date (newest first)
    const notifications = user.notifications.sort(
      (a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    return {
      success: true,
      notifications: notifications.map((n: Notification & { _id?: ObjectId }) => ({
        ...n,
        _id: n._id?.toString(),
        userId: n.userId.toString(),
      })),
    }
  } catch (error: any) {
    logger.error("Failed to get notifications", error)
    return { error: error.message || "Failed to get notifications" }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const usersCollection = await getCollection("users")

    await usersCollection.updateOne(
      {
        _id: new ObjectId(currentUser.userId),
        "notifications._id": new ObjectId(notificationId),
      },
      { $set: { "notifications.$.isRead": true } },
    )

    revalidatePath("/dashboard/notifications")
    return { success: true }
  } catch (error: any) {
    logger.error("Failed to mark notification as read", error)
    return { error: error.message || "Failed to mark notification as read" }
  }
}

export async function markAllNotificationsAsRead() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const usersCollection = await getCollection("users")

    await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      { $set: { "notifications.$[].isRead": true } },
    )

    revalidatePath("/dashboard/notifications")
    return { success: true }
  } catch (error: any) {
    logger.error("Failed to mark all notifications as read", error)
    return { error: error.message || "Failed to mark all notifications as read" }
  }
}

export async function deleteNotification(notificationId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const usersCollection = await getCollection("users")

    await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      { pull: { notifications: { _id: new ObjectId(notificationId) } } },
    )

    revalidatePath("/dashboard/notifications")
    return { success: true }
  } catch (error: any) {
    logger.error("Failed to delete notification", error)
    return { error: error.message || "Failed to delete notification" }
  }
}

