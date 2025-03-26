"use server"

import { Stripe } from "stripe"
import { revalidatePath } from "next/cache"
import { Collection,ObjectId } from "mongodb"

import clientPromise from "@/lib/db"
import { getCurrentUser } from "./auth-actions"
import { createLogger } from "@/lib/logger"
import { createNotification } from "./notification-actions"

const logger = createLogger("payment-actions")

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

export async function createPaymentIntent(amount: number, currency = "usd") {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        userId: currentUser.userId,
      },
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error("Create payment intent error:", error)
    return { error: "Failed to create payment intent" }
  }
}

export async function createEscrow(amount: number, paymentIntentId: string) {
  // In a real application, this would interact with your escrow system
  // For this example, we'll just verify the payment was successful
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return { error: "Payment has not been completed" }
    }

    // Generate a unique escrow ID
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    return {
      success: true,
      escrowId,
    }
  } catch (error) {
    console.error("Create escrow error:", error)
    return { error: "Failed to create escrow" }
  }
}

export async function releaseEscrow(escrowId: string) {
  // In a real application, this would release funds from your escrow system
  // For this example, we'll  {
  // In a real application, this would release funds from your escrow system
  // For this example, we'll just return success
  return {
    success: true,
  }
}

interface BankAccount {
  _id: ObjectId;
  userId: ObjectId;
  accountType: string;
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  createdAt: Date;
}

interface User {
  _id: ObjectId;
  bankAccounts: BankAccount[];
}

export async function addBankAccount(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const accountType = formData.get("accountType") as string
  const accountName = formData.get("accountName") as string
  const accountNumber = formData.get("accountNumber") as string
  const routingNumber = formData.get("routingNumber") as string
  const isDefault = formData.get("isDefault") === "true"

  if (!accountType || !accountName || !accountNumber || !routingNumber) {
    return { error: "All fields are required" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection: Collection<User> = db.collection("users")

    // In a real application, you would validate the bank account details
    // and possibly use a service like Plaid or Stripe to verify ownership

    // Store only last 4 digits for security
    const lastFourDigits = accountNumber.slice(-4)

    // Create bank account object
    const bankAccount = {
      _id: new ObjectId(),
      userId: new ObjectId(currentUser.userId),
      accountType,
      accountName,
      accountNumber: `****${lastFourDigits}`,
      isDefault,
      createdAt: new Date(),
    }

    // If this is the default account, unset any existing default
    if (isDefault) {
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUser.userId) },
        { $set: { "bankAccounts.$[].isDefault": false } },
      )
    }

    // Add bank account to user
    await usersCollection.updateOne({ _id: new ObjectId(currentUser.userId) }, 
    { $push: { bankAccounts: { $each: [bankAccount] } } }
  )

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error) {
    console.error("Add bank account error:", error)
    return { error: "Failed to add bank account" }
  }
}

export async function getBankAccounts() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })

    if (!user) {
      return { error: "User not found" }
    }

    return {
      success: true,
      bankAccounts: user.bankAccounts || [],
    }
  } catch (error) {
    console.error("Get bank accounts error:", error)
    return { error: "Failed to fetch bank accounts" }
  }
}

export async function addFundsToWallet(amount: number, paymentMethod: string, sourceId = "default") {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  if (amount <= 0) {
    return { error: "Amount must be greater than zero" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection = db.collection("users")
    const transactionsCollection = db.collection("wallet_transactions")

    // In a real application, you would process the payment through Stripe or another payment processor
    // For this demo, we'll just add the funds directly to the wallet

    // Update user's wallet balance
    await usersCollection.updateOne({ _id: new ObjectId(currentUser.userId) }, { $inc: { walletBalance: amount } })

    // Create a transaction record
    const transaction = {
      userId: new ObjectId(currentUser.userId),
      amount,
      type: "deposit",
      method: paymentMethod,
      sourceId: sourceId,
      status: "completed",
      description: `Wallet funding via ${paymentMethod}`,
      createdAt: new Date(),
    }

    await transactionsCollection.insertOne(transaction)

    // Create notification
    await createNotification({
      userId: currentUser.userId,
      title: "Funds Added",
      message: `$${amount.toFixed(2)} has been added to your wallet`,
      type: "success",
      relatedTo: {
        type: "transaction",
        id: "wallet",
      },
    })

    logger.info("Funds added to wallet", {
      userId: currentUser.userId,
      amount,
      method: paymentMethod,
    })

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error: any) {
    logger.error("Add funds to wallet error:", error)
    return { error: error.message || "Failed to add funds to wallet" }
  }
}

export async function getWalletTransactions() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const transactionsCollection = db.collection("wallet_transactions")

    // Get all wallet transactions for this user
    const transactions = await transactionsCollection
      .find({ userId: new ObjectId(currentUser.userId) })
      .sort({ createdAt: -1 })
      .limit(10) // Get the 10 most recent transactions
      .toArray()

    return {
      success: true,
      transactions: transactions.map((t) => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
      })),
    }
  } catch (error: any) {
    logger.error("Get wallet transactions error:", error)
    return { error: error.message || "Failed to fetch wallet transactions" }
  }
}

interface CreditCard {
  _id: ObjectId
  userId: ObjectId
  last4: string
  brand: string
  expMonth: string
  expYear: string
  cardholderName: string
  isDefault: boolean
  createdAt: Date
}
interface User {
  _id: ObjectId;
  creditCards: CreditCard[];
}

export async function addCreditCard(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const cardNumber = formData.get("cardNumber") as string
  const cardholderName = formData.get("cardholderName") as string
  const expMonth = formData.get("expMonth") as string
  const expYear = formData.get("expYear") as string
  const cvc = formData.get("cvc") as string
  const isDefault = formData.get("isDefault") === "true"

  if (!cardNumber || !cardholderName || !expMonth || !expYear || !cvc) {
    return { error: "All fields are required" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection: Collection<User> = db.collection("users")

    // In a real application, you would use Stripe to create a payment method
    // For this demo, we'll just store the card details (securely in a real app)

    // Store only last 4 digits for security
    const last4 = cardNumber.slice(-4)

    // Determine card brand based on first digit
    let brand = "unknown"
    const firstDigit = cardNumber.charAt(0)
    if (firstDigit === "4") brand = "visa"
    else if (firstDigit === "5") brand = "mastercard"
    else if (firstDigit === "3") brand = "amex"
    else if (firstDigit === "6") brand = "discover"

    // Create credit card object

    const creditCard = {
      _id: new ObjectId(),
      userId: new ObjectId(currentUser.userId),
      last4,
      brand,
      expMonth,
      expYear,
      cardholderName,
      isDefault,
      createdAt: new Date(),
    }

    // If this is the default card, unset any existing default
    if (isDefault) {
      await usersCollection.updateOne(
        { _id: new ObjectId(currentUser.userId) },
        { $set: { "creditCards.$[].isDefault": false } },
      )
    }

    // Add credit card to user
    await usersCollection.updateOne({ _id: new ObjectId(currentUser.userId) }, { $push: { creditCards: creditCard } })

    revalidatePath("/dashboard/wallet")
    return { success: true }
  } catch (error: any) {
    logger.error("Add credit card error:", error)
    return { error: error.message || "Failed to add credit card" }
  }
}

export async function getCreditCards() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })

    if (!user) {
      return { error: "User not found" }
    }

    return {
      success: true,
      cards: user.creditCards || [],
    }
  } catch (error: any) {
    logger.error("Get credit cards error:", error)
    return { error: error.message || "Failed to fetch credit cards" }
  }
}




