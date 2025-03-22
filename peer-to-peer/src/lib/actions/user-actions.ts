"use server"

import { ObjectId } from "mongodb"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

import { getCollection } from "@/lib/db"
import { getCurrentUser } from "./auth-actions"
import { createLogger } from "@/lib/logger"

const logger = createLogger("user-actions")

export async function updateUserProfile(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string

  if (!name || !email) {
    return { error: "Name and email are required" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Check if email is already taken by another user
    if (email !== currentUser.email) {
      const existingUser = await usersCollection.findOne({
        email,
        _id: { $ne: new ObjectId(currentUser.userId) },
      })

      if (existingUser) {
        return { error: "Email is already taken" }
      }
    }

    // Update user profile
    await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      {
        $set: {
          name,
          email,
          updatedAt: new Date(),
        },
      },
    )

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch (error: any) {
    logger.error("Update user profile error:", error)
    return { error: error.message || "Failed to update profile" }
  }
}

export async function changePassword(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required" }
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" }
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Get user with password
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })

    if (!user) {
      return { error: "User not found" }
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return { error: "Current password is incorrect" }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await usersCollection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
    )

    return { success: true }
  } catch (error: any) {
    logger.error("Change password error:", error)
    return { error: error.message || "Failed to change password" }
  }
}

export async function deleteAccount(formData: FormData) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return { error: "You must be logged in" }
  }

  const password = formData.get("password") as string
  const confirmation = formData.get("confirmation") as string

  if (!password || confirmation !== "DELETE") {
    return { error: "Password and confirmation are required" }
  }

  try {
    const usersCollection = await getCollection("users")
    const transactionsCollection = await getCollection("transactions")

    // Get user with password
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUser.userId) })

    if (!user) {
      return { error: "User not found" }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return { error: "Password is incorrect" }
    }

    // Check if user has active transactions
    const activeTransactions = await transactionsCollection.countDocuments({
      $or: [
        { "buyer.userId": new ObjectId(currentUser.userId) },
        { "seller.userId": new ObjectId(currentUser.userId) },
      ],
      status: { $in: ["active", "pending", "disputed"] },
    })

    if (activeTransactions > 0) {
      return {
        error: "Cannot delete account with active transactions. Please complete or cancel all transactions first.",
      }
    }

    // Delete user
    await usersCollection.deleteOne({ _id: new ObjectId(currentUser.userId) })

    return { success: true }
  } catch (error: any) {
    logger.error("Delete account error:", error)
    return { error: error.message || "Failed to delete account" }
  }
}

