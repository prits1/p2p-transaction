"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

import { getCollection } from "@/lib/db"
import type { Message } from "@/lib/models"
import { getCurrentUser } from "./auth-actions"
import { createNotification } from "./notification-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("message-actions")

export async function getMessages(transactionId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const messagesCollection = await getCollection("messages")

    // Verify user has access to this transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found or access denied" }
    }

    // Get messages
    const messages = await messagesCollection
      .find({ transactionId: new ObjectId(transactionId) })
      .sort({ timestamp: 1 })
      .toArray()

    return {
      success: true,
      messages: messages.map((m) => ({
        ...m,
        _id: m._id.toString(),
        transactionId: m.transactionId.toString(),
        sender: m.sender.toString(),
      })),
    }
  } catch (error) {
    console.error("Get messages error:", error)
    return { error: "Failed to fetch messages" }
  }
}

export async function getUnreadMessages() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const messagesCollection = await getCollection("messages")

    // Count unread messages where the current user is not the sender
    const unreadCount = await messagesCollection.countDocuments({
      sender: { $ne: new ObjectId(currentUser.userId) },
      isRead: false,
    })

    return {
      success: true,
      unreadCount,
    }
  } catch (error: any) {
    logger.error("Get unread messages error:", error)
    return { error: error.message || "Failed to fetch unread messages" }
  }
}

export async function sendMessage(transactionId: string, content: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  if (!content.trim()) {
    return { error: "Message cannot be empty" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const messagesCollection = await getCollection("messages")

    // Verify user has access to this transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found or access denied" }
    }

    // Create message
    const newMessage: Message = {
      transactionId: new ObjectId(transactionId),
      sender: new ObjectId(currentUser.userId),
      senderName: currentUser.name,
      content,
      timestamp: new Date(),
      isRead: false,
    }

    const result = await messagesCollection.insertOne(newMessage)

    // Determine recipient
    const recipientId = transaction.buyer.userId.equals(new ObjectId(currentUser.userId))
      ? transaction.seller.userId.toString()
      : transaction.buyer.userId.toString()

    // Send notification to recipient
    await createNotification({
      userId: recipientId,
      title: "New Message",
      message: `${currentUser.name} sent you a message regarding transaction: ${transaction.title}`,
      type: "info",
      relatedTo: {
        type: "transaction",
        id: transactionId,
      },
    })

    logger.info("Message sent", {
      transactionId,
      messageId: result.insertedId.toString(),
      userId: currentUser.userId,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    logger.error("Send message error:", error)
    return {
      error: error.message || "Failed to send message",
    }
  }
}

export async function markMessageAsRead(messageId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const messagesCollection = await getCollection("messages")

    await messagesCollection.updateOne(
      {
        _id: new ObjectId(messageId),
        sender: { $ne: new ObjectId(currentUser.userId) }, // Only mark as read if not sent by current user
      },
      { $set: { isRead: true } },
    )

    return { success: true }
  } catch (error: any) {
    logger.error("Mark message as read error:", error)
    return { error: error.message || "Failed to mark message as read" }
  }
}




