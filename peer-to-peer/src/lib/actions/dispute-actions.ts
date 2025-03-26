"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

import { getCollection } from "@/lib/db"
import { getCurrentUser } from "./auth-actions"
import { createNotification } from "./notification-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("dispute-actions")

export async function getDisputes() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const disputesCollection = await getCollection("disputes")
    const transactionsCollection = await getCollection("transactions")

    // Find all disputes where the user is either the buyer or seller of the transaction
    const disputes = await disputesCollection
      .find({
        $or: [
          { raisedBy: new ObjectId(currentUser.userId) },
          { "transaction.buyer.userId": new ObjectId(currentUser.userId) },
          { "transaction.seller.userId": new ObjectId(currentUser.userId) },
        ],
      })
      .toArray()

    // For each dispute, get the associated transaction details
    const disputesWithTransactions = await Promise.all(
      disputes.map(async (dispute) => {
        const transaction = await transactionsCollection.findOne({
          _id: dispute.transactionId,
        })

        return {
          ...dispute,
          _id: dispute._id.toString(),
          raisedBy: dispute.raisedBy.toString(),
          transactionId: dispute.transactionId.toString(),
          transaction: {
            ...transaction,
            _id: transaction?._id?.toString() || null,
            buyer: {
              ...(transaction?.buyer || {}),
              userId: transaction?.buyer?.userId?.toString() || null,
            },
            seller: {
              ...(transaction?.seller || {}),
              userId: transaction?.seller?.userId?.toString() || null,
            },
          },
        }
      }),
    )

    return { success: true, disputes: disputesWithTransactions }
  } catch (error: any) {
    logger.error("Get disputes error:", error)
    return { error: error.message || "Failed to fetch disputes" }
  }
}

export async function getDisputeById(disputeId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const disputesCollection = await getCollection("disputes")
    const transactionsCollection = await getCollection("transactions")

    const dispute = await disputesCollection.findOne({
      _id: new ObjectId(disputeId),
    })

    if (!dispute) {
      return { error: "Dispute not found" }
    }

    const transaction = await transactionsCollection.findOne({
      _id: dispute.transactionId,
    })

    if (!transaction) {
      return { error: "Associated transaction not found" }
    }

    // Check if user has access to this dispute
    const isUserInvolved =
      transaction.buyer.userId.equals(new ObjectId(currentUser.userId)) ||
      transaction.seller.userId.equals(new ObjectId(currentUser.userId)) ||
      dispute.raisedBy.equals(new ObjectId(currentUser.userId))

    if (!isUserInvolved) {
      return { error: "You don't have access to this dispute" }
    }

    return {
      success: true,
      dispute: {
        ...dispute,
        _id: dispute._id.toString(),
        raisedBy: dispute.raisedBy.toString(),
        transactionId: dispute.transactionId.toString(),
        transaction: {
          ...transaction,
          _id: transaction._id.toString(),
          buyer: {
            ...transaction.buyer,
            userId: transaction.buyer.userId.toString(),
          },
          seller: {
            ...transaction.seller,
            userId: transaction.seller.userId.toString(),
          },
        },
      },
    }
  } catch (error: any) {
    logger.error("Get dispute by ID error:", error)
    return { error: error.message || "Failed to fetch dispute" }
  }
}

export async function respondToDispute(disputeId: string, response: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  if (!response.trim()) {
    return { error: "Response cannot be empty" }
  }

  try {
    const disputesCollection = await getCollection("disputes")
    const messagesCollection = await getCollection("messages")

    const dispute = await disputesCollection.findOne({
      _id: new ObjectId(disputeId),
    })

    if (!dispute) {
      return { error: "Dispute not found" }
    }

    // Add response to dispute messages
    await messagesCollection.insertOne({
      transactionId: dispute.transactionId,
      sender: new ObjectId(currentUser.userId),
      senderName: currentUser.name,
      content: response,
      timestamp: new Date(),
      isRead: false,
      isDisputeMessage: true,
    })

    // Notify the other party
    const otherPartyId = dispute.raisedBy.equals(new ObjectId(currentUser.userId))
      ? dispute.respondentId
        ? dispute.respondentId.toString()
        : null
      : dispute.raisedBy.toString()

    if (otherPartyId) {
      await createNotification({
        userId: otherPartyId,
        title: "New Dispute Response",
        message: `${currentUser.name} has responded to the dispute for transaction #${dispute.transactionId.toString().substring(0, 8)}`,
        type: "warning",
        relatedTo: {
          type: "dispute",
          id: disputeId,
        },
      })
    }

    revalidatePath(`/dashboard/disputes/${disputeId}`)
    return { success: true }
  } catch (error: any) {
    logger.error("Respond to dispute error:", error)
    return { error: error.message || "Failed to respond to dispute" }
  }
}

