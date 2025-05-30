"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

import { getCollection } from "@/lib/db"
import type { Transaction } from "@/lib/models"
import { getCurrentUser } from "./auth-actions"
import { createEscrow, releaseEscrow } from "./payment-actions"
import { createNotification } from "./notification-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("transaction-actions")

export async function createTransaction(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const currency = formData.get("currency") as string
  const role = formData.get("role") as string
  const counterpartyEmail = formData.get("counterparty") as string
  const paymentMethod = formData.get("paymentMethod") as string
  const paymentDetails = formData.get("paymentDetails") as string
  const useWallet = formData.get("useWallet") === "true"

  if (!title || !description || !amount || !currency || !role || !counterpartyEmail || !paymentMethod) {
    return { error: "All fields are required" }
  }

  try {
    const usersCollection = await getCollection("users")
    const transactionsCollection = await getCollection("transactions")

    // Find counterparty
    const counterparty = await usersCollection.findOne({ email: counterpartyEmail })
    if (!counterparty) {
      return { error: "Counterparty not found" }
    }

    // Create transaction object
    const newTransaction: Transaction = {
      title,
      description,
      amount,
      currency,
      status: "pending",
      buyer:
        role === "buyer"
          ? {
              userId: new ObjectId(currentUser.userId),
              email: currentUser.email,
              name: currentUser.name,
            }
          : {
              userId: counterparty._id,
              email: counterparty.email,
              name: counterparty.name,
            },
      seller:
        role === "seller"
          ? {
              userId: new ObjectId(currentUser.userId),
              email: currentUser.email,
              name: currentUser.name,
            }
          : {
              userId: counterparty._id,
              email: counterparty.email,
              name: counterparty.name,
            },
      escrowFunded: false,
      paymentMethod: {
        type: paymentMethod as "bank" | "card" | "wallet",
        details: paymentDetails,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [
        {
          date: new Date(),
          event: "Transaction created",
          description: `Transaction initiated by ${currentUser.name}`,
        },
      ],
    }

    const result = await transactionsCollection.insertOne(newTransaction)

    // Send notification to counterparty
    await createNotification({
      userId: role === "buyer" ? newTransaction.seller.userId.toString() : newTransaction.buyer.userId.toString(),
      title: "New Transaction",
      message: `${currentUser.name} has created a new transaction with you: ${title}`,
      type: "info",
      relatedTo: {
        type: "transaction",
        id: result.insertedId.toString(),
      },
    })

    logger.info("Transaction created", {
      transactionId: result.insertedId.toString(),
      userId: currentUser.userId,
    })

    // If buyer is creating the transaction and wants to use wallet, fund it immediately
    if (role === "buyer" && useWallet && paymentMethod === "wallet") {
      const fundResult = await fundEscrowFromWallet(result.insertedId.toString())
      if (fundResult.error) {
        return {
          success: true,
          transactionId: result.insertedId.toString(),
          warning: fundResult.error,
        }
      }
    }

    revalidatePath("/dashboard/transactions")
    return {
      success: true,
      transactionId: result.insertedId.toString(),
    }
  } catch (error: any) {
    console.error("Create transaction error:", error)
    logger.error("Create transaction error:", error)
    return {
      error: error.message || "Failed to create transaction",
    }
  }
}

export async function getTransactions(filter?: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")

    // Build query based on user role and filter
    const query: any = {
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    }

    if (filter === "escrow") {
      query.status = "active"
      query.escrowFunded = true
    }

    const transactions = await transactionsCollection.find(query).sort({ createdAt: -1 }).toArray()

    return {
      success: true,
      transactions: transactions.map((t) => ({
        ...t,
        _id: t._id.toString(),
        buyer: {
          ...t.buyer,
          userId: t.buyer.userId.toString(),
        },
        seller: {
          ...t.seller,
          userId: t.seller.userId.toString(),
        },
      })),
    }
  } catch (error) {
    console.error("Get transactions error:", error)
    return { error: "Failed to fetch transactions" }
  }
}

export async function getTransaction(id: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")

    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(id),
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found" }
    }

    // Determine user's role in this transaction
    const userRole = transaction.buyer.userId.equals(new ObjectId(currentUser.userId)) ? "buyer" : "seller"

    return {
      success: true,
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
      userRole,
    }
  } catch (error) {
    console.error("Get transaction error:", error)
    return { error: "Failed to fetch transaction" }
  }
}

export async function fundEscrowFromWallet(transactionId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const usersCollection = await getCollection("users")

    // Get transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      "buyer.userId": new ObjectId(currentUser.userId),
    })

    if (!transaction) {
      return { error: "Transaction not found or you are not the buyer" }
    }

    if (transaction.escrowFunded) {
      return { error: "Escrow already funded" }
    }

    // Check if user has enough balance
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })
    if (!user || user.walletBalance < transaction.amount) {
      return { error: "Insufficient wallet balance" }
    }

    // Deduct from wallet
    await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      { $inc: { walletBalance: -transaction.amount } },
    )

    // Generate a unique escrow ID
    const escrowId = `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Update transaction
    await transactionsCollection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "active",
          escrowFunded: true,
          escrowId: escrowId,
          updatedAt: new Date(),
        },
        $push: {
          // timeline: {
            // date: new Date(),
            // event: "Escrow funded from wallet",
            // description: `Buyer funded the escrow from wallet balance`,
          // },
          value : currentUser.walletBalance
        },
      },
    )

    // Send notification to seller
    await createNotification({
      userId: transaction.seller.userId.toString(),
      title: "Escrow Funded",
      message: `The buyer has funded the escrow for transaction: ${transaction.title}`,
      type: "success",
      relatedTo: {
        type: "transaction",
        id: transactionId,
      },
    })

    logger.info("Escrow funded from wallet", {
      transactionId,
      userId: currentUser.userId,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Fund escrow from wallet error:", error)
    logger.error("Fund escrow from wallet error:", error)
    return {
      error: error.message || "Failed to fund escrow from wallet",
    }
  }
}

export async function fundEscrow(transactionId: string, paymentIntentId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")

    // Get transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      "buyer.userId": new ObjectId(currentUser.userId),
    })

    if (!transaction) {
      return { error: "Transaction not found or you are not the buyer" }
    }

    if (transaction.escrowFunded) {
      return { error: "Escrow already funded" }
    }

    // Create escrow in payment system
    const escrowResult = await createEscrow(transaction.amount, paymentIntentId)

    if (!escrowResult.success) {
      return { error: escrowResult.error }
    }

    // Update transaction
    await transactionsCollection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "active",
          escrowFunded: true,
          escrowId: escrowResult.escrowId,
          updatedAt: new Date(),
        },
        $push: {
          // timeline: {
          //   date: new Date(),
          //   event: "Escrow funded",
          //   description: `Buyer funded the escrow account`,
          // },
          value : currentUser.walletBalance
        },
      },
    )

    // Send notification to seller
    await createNotification({
      userId: transaction.seller.userId.toString(),
      title: "Escrow Funded",
      message: `The buyer has funded the escrow for transaction: ${transaction.title}`,
      type: "success",
      relatedTo: {
        type: "transaction",
        id: transactionId,
      },
    })

    logger.info("Escrow funded", {
      transactionId,
      userId: currentUser.userId,
      paymentIntentId,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Fund escrow error:", error)
    logger.error("Fund escrow error:", error)
    return {
      error: error.message || "Failed to fund escrow",
    }
  }
}

export async function releaseEscrowFunds(transactionId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const usersCollection = await getCollection("users")

    // Get transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found" }
    }

    if (!transaction.escrowFunded) {
      return { error: "Escrow not funded" }
    }

    if (transaction.status !== "active") {
      return { error: "Transaction is not active" }
    }

    // Only buyer can release funds
    if (!transaction.buyer.userId.equals(new ObjectId(currentUser.userId))) {
      return { error: "Only the buyer can release funds" }
    }

    // If it's a wallet transaction, add funds to seller's wallet
    if (transaction.paymentMethod.type === "wallet") {
      await usersCollection.updateOne(
        { _id: transaction.seller.userId },
        { $inc: { walletBalance: transaction.amount } },
      )
    } else {
      // Release escrow in payment system
      const releaseResult = await releaseEscrow(transaction.escrowId!)

      if (!releaseResult.success) {
        return { error: "Unknown error" }
      }
    }

    // Update transaction
    await transactionsCollection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        $push: {
          // timeline: {
          //   date: new Date(),
          //   event: "Transaction completed",
          //   description: `Buyer released funds to seller`,
          // },
          value: currentUser.walletBalance,
        },
      },
    )

    // Send notification to seller
    await createNotification({
      userId: transaction.seller.userId.toString(),
      title: "Funds Released",
      message: `The buyer has released funds for transaction: ${transaction.title}`,
      type: "success",
      relatedTo: {
        type: "transaction",
        id: transactionId,
      },
    })

    logger.info("Escrow funds released", {
      transactionId,
      userId: currentUser.userId,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Release escrow error:", error)
    logger.error("Release escrow error:", error)
    return {
      error: error.message || "Failed to release escrow",
    }
  }
}

export async function createDispute(transactionId: string, reason: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const disputesCollection = await getCollection("disputes")

    // Get transaction
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found" }
    }

    if (transaction.status !== "active") {
      return { error: "Can only dispute active transactions" }
    }

    // Create dispute
    const disputeResult = await disputesCollection.insertOne({
      transactionId: new ObjectId(transactionId),
      raisedBy: new ObjectId(currentUser.userId),
      reason,
      status: "open",
      createdAt: new Date(),
    })

    // Update transaction
    await transactionsCollection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          status: "disputed",
          updatedAt: new Date(),
        },
        $push: {
          // timeline: {
          //   date: new Date(),
          //   event: "Dispute raised",
          //   description: `Dispute raised by ${currentUser.name}: ${reason}`,
          // },
          value: currentUser.walletBalance,
      },
      },
    )

    // Send notification to counterparty
    const counterpartyId = transaction.buyer.userId.equals(new ObjectId(currentUser.userId))
      ? transaction.seller.userId.toString()
      : transaction.buyer.userId.toString()

    await createNotification({
      userId: counterpartyId,
      title: "Dispute Raised",
      message: `A dispute has been raised for transaction: ${transaction.title}`,
      type: "warning",
      relatedTo: {
        type: "dispute",
        id: disputeResult.insertedId.toString(),
      },
    })

    logger.info("Dispute created", {
      transactionId,
      disputeId: disputeResult.insertedId.toString(),
      userId: currentUser.userId,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Create dispute error:", error)
    logger.error("Create dispute error:", error)
    return {
      error: error.message || "Failed to create dispute",
    }
  }
}



