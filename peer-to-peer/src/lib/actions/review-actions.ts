"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"

import { getCollection } from "@/lib/db"
import type { Review } from "@/lib/models"
import { getCurrentUser } from "./auth-actions"
import { createNotification } from "./notification-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("review-actions")

export async function submitReview({
  transactionId,
  revieweeId,
  rating,
  comment,
}: {
  transactionId: string
  revieweeId: string
  rating: number
  comment: string
}) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  if (rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5" }
  }

  try {
    const transactionsCollection = await getCollection("transactions")
    const reviewsCollection = await getCollection("reviews")
    const usersCollection = await getCollection("users")

    // Verify transaction exists and is completed
    const transaction = await transactionsCollection.findOne({
      _id: new ObjectId(transactionId),
      status: "completed",
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
    })

    if (!transaction) {
      return { error: "Transaction not found or not completed" }
    }

    // Check if user has already reviewed this transaction
    const existingReview = await reviewsCollection.findOne({
      transactionId: new ObjectId(transactionId),
      reviewerId: new ObjectId(currentUser.userId),
    })

    if (existingReview) {
      return { error: "You have already reviewed this transaction" }
    }

    // Verify reviewee is part of the transaction
    const isRevieweeInTransaction =
      transaction.buyer.userId.toString() === revieweeId || transaction.seller.userId.toString() === revieweeId

    if (!isRevieweeInTransaction) {
      return { error: "Reviewee is not part of this transaction" }
    }

    // Create review
    const review: Review = {
      transactionId: new ObjectId(transactionId),
      reviewerId: new ObjectId(currentUser.userId),
      revieweeId: new ObjectId(revieweeId),
      rating,
      comment,
      createdAt: new Date(),
    }

    await reviewsCollection.insertOne(review)

    // Update user's trust score
    // Get all reviews for this user
    const allReviews = await reviewsCollection
      .find({
        revieweeId: new ObjectId(revieweeId),
      })
      .toArray()

    // Calculate new trust score (average of all ratings)
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0)
    const newTrustScore = totalRating / allReviews.length

    // Update user's trust score
    await usersCollection.updateOne({ _id: new ObjectId(revieweeId) }, { $set: { trustScore: newTrustScore } })

    // Send notification to reviewee
    await createNotification({
      userId: revieweeId,
      title: "New Review",
      message: `${currentUser.name} has left you a review for transaction: ${transaction.title}`,
      type: "info",
      relatedTo: {
        type: "transaction",
        id: transactionId,
      },
    })

    logger.info("Review submitted", {
      transactionId,
      reviewerId: currentUser.userId,
      revieweeId,
      rating,
    })

    revalidatePath(`/dashboard/transactions/${transactionId}`)
    return { success: true }
  } catch (error: any) {
    logger.error("Submit review error:", error)
    return { error: error.message || "Failed to submit review" }
  }
}

export async function getReviewsForUser(userId: string) {
  try {
    const reviewsCollection = await getCollection("reviews")
    const usersCollection = await getCollection("users")

    // Get all reviews for this user
    const reviews = await reviewsCollection
      .find({
        revieweeId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .toArray()

    // Get reviewer details for each review
    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        const reviewer = await usersCollection.findOne({
          _id: review.reviewerId,
        })

        return {
          ...review,
          _id: review._id.toString(),
          transactionId: review.transactionId.toString(),
          reviewerId: review.reviewerId.toString(),
          revieweeId: review.revieweeId.toString(),
          reviewerName: reviewer?.name || "Unknown User",
        }
      }),
    )

    return { success: true, reviews: reviewsWithDetails }
  } catch (error: any) {
    logger.error("Get reviews error:", error)
    return { error: error.message || "Failed to fetch reviews" }
  }
}

