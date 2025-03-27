import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/db"
import { createLogger } from "@/lib/logger"
import { createNotification } from "@/lib/actions/notification-actions"

// Use dynamic rendering for webhook routes
export const dynamic = "force-dynamic"

const logger = createLogger("stripe-webhook")
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break
      default:
        logger.info(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    logger.error(`Webhook error: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 500 })
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`PaymentIntent ${paymentIntent.id} succeeded`)

  try {
    // Check if this payment is for wallet funding
    if (paymentIntent.metadata.purpose === "wallet_funding") {
      const userId = paymentIntent.metadata.userId
      if (!userId) {
        logger.error("No userId found in payment intent metadata")
        return
      }

      const client = await clientPromise
      const db = client.db()
      const usersCollection = db.collection("users")
      const transactionsCollection = db.collection("wallet_transactions")

      // Get amount in dollars
      const amount = paymentIntent.amount / 100

      // Update user's wallet balance
      await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $inc: { walletBalance: amount } })

      // Create a transaction record
      const transaction = {
        userId: new ObjectId(userId),
        amount,
        type: "deposit",
        method: "card",
        sourceId: paymentIntent.payment_method,
        status: "completed",
        description: `Wallet funding via credit card`,
        createdAt: new Date(),
      }

      await transactionsCollection.insertOne(transaction)

      // Create notification
      await createNotification({
        userId,
        title: "Payment Successful",
        message: `$${amount.toFixed(2)} has been added to your wallet`,
        type: "success",
        relatedTo: {
          type: "transaction",
          id: "wallet",
        },
      })

      logger.info(`Wallet funded for user ${userId} with amount ${amount}`)
    }
  } catch (error: any) {
    logger.error(`Error processing successful payment: ${error.message}`)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`PaymentIntent ${paymentIntent.id} failed`)

  try {
    // Check if this payment is for wallet funding
    if (paymentIntent.metadata.purpose === "wallet_funding") {
      const userId = paymentIntent.metadata.userId
      if (!userId) {
        logger.error("No userId found in payment intent metadata")
        return
      }

      // Create notification about failed payment
      await createNotification({
        userId,
        title: "Payment Failed",
        message: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} failed. Please try again or use a different payment method.`,
        type: "error",
        relatedTo: {
          type: "transaction",
          id: "wallet",
        },
      })

      logger.info(`Payment failed notification sent to user ${userId}`)
    }
  } catch (error: any) {
    logger.error(`Error processing failed payment: ${error.message}`)
  }
}

