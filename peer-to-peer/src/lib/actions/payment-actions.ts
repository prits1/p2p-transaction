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
        purpose: "wallet_funding",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }
  }  catch (error: any) {
    logger.error("Create payment intent error:", error)
    return { error: error.message || "Failed to create payment intent" }
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
      routingNumber: `****${routingNumber.slice(-4)}`,
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

    interface BankAccountResponse {
      _id: string;
      userId: string;
      accountType: string;
      accountName: string;
      accountNumber: string;
      isDefault: boolean;
      createdAt: Date;
    }

    return {
      success: true,
      bankAccounts:
      user.bankAccounts?.map((account: BankAccount): BankAccountResponse => ({
        ...account,
        _id: account._id.toString(),
        userId: account.userId.toString(),
      })) || [],
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

export async function withdrawFromWallet(amount: number, withdrawMethod: string, destinationId: string) {
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

    // Get current user to check balance
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })

    if (!user) {
      return { error: "User not found" }
    }

    if (user.walletBalance < amount) {
      return { error: "Insufficient funds in wallet" }
    }

    const transactionsCollection = db.collection("wallet_transactions")

    // Update user's wallet balance
    await usersCollection.updateOne({ _id: new ObjectId(currentUser.userId) }, { $inc: { walletBalance: -amount } })

    // Create a transaction record
    const transaction = {
      userId: new ObjectId(currentUser.userId),
      amount,
      type: "withdrawal",
      method: withdrawMethod,
      destinationId: destinationId,
      status: "processing", // Initially set as processing
      description: `Withdrawal to ${withdrawMethod}`,
      createdAt: new Date(),
    }

    const result = await transactionsCollection.insertOne(transaction)

    // In a real application, you would initiate a transfer to the user's bank account
    // For this demo, we'll simulate a processing period and then mark it as completed

    // Create a withdrawal request record
    const withdrawalsCollection = db.collection("withdrawal_requests")
    await withdrawalsCollection.insertOne({
      userId: new ObjectId(currentUser.userId),
      transactionId: result.insertedId,
      amount,
      method: withdrawMethod,
      destinationId,
      status: "processing",
      createdAt: new Date(),
    })

    // Create notification
    await createNotification({
      userId: currentUser.userId,
      title: "Withdrawal Initiated",
      message: `Your withdrawal of $${amount.toFixed(2)} has been initiated and is being processed.`,
      type: "info",
      relatedTo: {
        type: "transaction",
        id: result.insertedId.toString(),
      },
    })

    logger.info("Withdrawal initiated", {
      userId: currentUser.userId,
      amount,
      method: withdrawMethod,
      transactionId: result.insertedId.toString(),
    })

    revalidatePath("/dashboard/wallet")
    return {
      success: true,
      message: "Withdrawal initiated and is being processed. This typically takes 1-3 business days.",
    }
  } catch (error: any) {
    logger.error("Withdraw from wallet error:", error)
    return { error: error.message || "Failed to process withdrawal" }
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
// interface User {
//   _id: ObjectId;
//   creditCards: CreditCard[];
// }

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
     // In a real application, you would use Stripe to create a payment method
    // For this demo, we'll create a payment method with Stripe
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber,
        exp_month: Number.parseInt(expMonth),
        exp_year: Number.parseInt(expYear),
        cvc: cvc,
      },
      billing_details: {
        name: cardholderName,
      },
    })
     // Attach the payment method to the customer
    // In a real app, you'd create a Stripe customer for each user
    // For this demo, we'll just store the payment method ID

    const client = await clientPromise
    const db = client.db()
    const usersCollection: Collection<User> = db.collection("users")

    // Store only last 4 digits for security
    const last4 = cardNumber.slice(-4)

    const brand = paymentMethod.card?.brand || "unknown"
    // Create credit card object

    const creditCard = {
      _id: new ObjectId(),
      userId: new ObjectId(currentUser.userId),
      paymentMethodId: paymentMethod.id,
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
    // Handle Stripe-specific errors
    if (error.type === "StripeCardError") {
      return { error: error.message || "Your card was declined" }
    }

    return { error: "Failed to add credit card. Please check your card details and try again." }
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

    interface CreditCardResponse {
      _id: string;
      userId: string;
      last4: string;
      brand: string;
      expMonth: string;
      expYear: string;
      cardholderName: string;
      isDefault: boolean;
      createdAt: Date;
    }

    return {
      success: true,
      cards:
      user.creditCards?.map((card: CreditCard): CreditCardResponse => ({
        ...card,
        _id: card._id.toString(),
        userId: card.userId.toString(),
      })) || [],
    }
  } catch (error: any) {
    logger.error("Get credit cards error:", error)
    return { error: error.message || "Failed to fetch credit cards" }
  }
}

export async function processStripePayment(paymentIntentId: string) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    // Retrieve the payment intent to verify it's successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return { error: "Payment has not been completed" }
    }

    // Verify this payment is for wallet funding and belongs to this user
    if (paymentIntent.metadata.purpose !== "wallet_funding" || paymentIntent.metadata.userId !== currentUser.userId) {
      return { error: "Invalid payment intent" }
    }

    // Get the amount from the payment intent (in cents)
    const amountInCents = paymentIntent.amount
    const amount = amountInCents / 100 // Convert to dollars

    // Add funds to wallet
    return await addFundsToWallet(amount, "card", paymentIntent.payment_method as string)
  } catch (error: any) {
    logger.error("Process Stripe payment error:", error)
    return { error: error.message || "Failed to process payment" }
  }
}

export async function getWithdrawalRequests() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  try {
    const client = await clientPromise
    const db = client.db()
    const withdrawalsCollection = db.collection("withdrawal_requests")

    // Get all withdrawal requests for this user
    const withdrawals = await withdrawalsCollection
      .find({ userId: new ObjectId(currentUser.userId) })
      .sort({ createdAt: -1 })
      .toArray()

    return {
      success: true,
      withdrawals: withdrawals.map((w) => ({
        ...w,
        _id: w._id.toString(),
        userId: w.userId.toString(),
        transactionId: w.transactionId.toString(),
      })),
    }
  } catch (error: any) {
    logger.error("Get withdrawal requests error:", error)
    return { error: error.message || "Failed to fetch withdrawal requests" }
  }
}




