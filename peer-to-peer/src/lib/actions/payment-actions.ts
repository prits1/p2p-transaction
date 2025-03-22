"use server"

import { Stripe } from "stripe"
import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"

import clientPromise from "@/lib/db"
import { getCurrentUser } from "./auth-actions"

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
  // For this example, we'll just return success
  return {
    success: true,
  }
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
    const usersCollection = db.collection("users")

    // In a real application, you would validate the bank account details
    // and possibly use a service like Plaid or Stripe to verify ownership

    // Store only last 4 digits for security
    const lastFourDigits = accountNumber.slice(-4)

    // Create bank account object
    const bankAccount = {
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
    await usersCollection.updateOne({ _id: new ObjectId(currentUser.userId) }, { push: { bankAccounts: bankAccount } })

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

