"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ObjectId } from "mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

import { getCollection } from "@/lib/db"
import type { User } from "@/lib/models"
import { sendPasswordResetEmail } from "@/lib/email"
import { createLogger } from "@/lib/logger"

const logger = createLogger("auth-actions")

// Make sure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  console.error("No JWT_SECRET found in environment variables")
}

const JWT_SECRET = process.env.JWT_SECRET || "local-development-secret-key-change-in-production"
const COOKIE_NAME = "auth-token"
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000 // 1 hour in milliseconds

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const role = formData.get("role") as string

  if (!email || !password || !name || !role) {
    return { error: "All fields are required" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return { error: "User already exists" }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user with $5 initial balance
    const newUser: User = {
      email,
      password: hashedPassword,
      name,
      role: role as "buyer" | "seller" | "admin",
      createdAt: new Date(),
      walletBalance: 5.0, // Give new users $5 initial balance
      trustScore: 5,
      bankAccounts: [],
    }

    const result = await usersCollection.insertOne(newUser)
    console.log("User created successfully:", result.insertedId.toString())

    // Create JWT token
    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email,
        name,
        role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return { success: true, userId: result.insertedId.toString() }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "Failed to create account" }
  }
}

export async function login(formData: FormData) {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
      return { error: "Email and password are required" }
    }

    const usersCollection = await getCollection("users")

    // Find user by email
    const user = await usersCollection.findOne({ email })

    if (!user) {
      return { error: "Invalid email or password" }
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return { error: "Invalid email or password" }
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return { success: true }
  } catch (error: any) {
    console.error("Login error:", error)
    return { error: error.message || "An error occurred during login" }
  }
}

export async function signOut() {
  (await cookies()).delete(COOKIE_NAME)
  redirect("/login")
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value

  if (!token) {
    console.log("No auth token found in cookies")
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      name: string
      role: string
    }

    const usersCollection = await getCollection("users")
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) })

    if (!user) {
      console.log("User not found in database")
      return null
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      walletBalance: user.walletBalance,
      trustScore: user.trustScore,
    }
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

// Update the requestPasswordReset function to properly handle the async email sending

export async function requestPasswordReset(email: string) {
  if (!email) {
    return { error: "Email is required" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Find user by email
    const user = await usersCollection.findOne({ email })

    // For security reasons, don't reveal if the email exists or not
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`)
      return { success: true } // Return success even if user doesn't exist
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex")

    // Set token expiry (1 hour from now)
    const resetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY)

    // Store the token in the database
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          resetToken: resetTokenHash,
          resetTokenExpiry,
        },
      },
    )

    // Create reset link
    // Make sure we have a valid base URL that doesn't end with a slash
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

    // Ensure the reset link is properly formatted
    const resetLink = `${baseUrl}/reset-password/${resetToken}`

    logger.info(`Generated reset link: ${resetLink}`)

    try {
      // Send password reset email
      const emailResult = await sendPasswordResetEmail(email, resetLink)

      // Log the preview URL if using Ethereal
      if (emailResult.previewUrl) {
        logger.info(`Password reset email preview: ${emailResult.previewUrl}`)
      }

      logger.info(`Password reset email sent to: ${email}`)
      return { success: true, previewUrl: emailResult.previewUrl }
    } catch (emailError) {
      logger.error("Failed to send password reset email:", emailError)
      // Still return success to not reveal if the email exists
      return { success: true, warning: "Email could not be sent, but reset token was created" }
    }
  } catch (error: any) {
    logger.error("Request password reset error:", error)
    return { error: "Failed to process password reset request" }
  }
}

export async function verifyResetToken(token: string) {
  if (!token) {
    return { error: "Token is required" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    // Find user with this token and valid expiry
    const user = await usersCollection.findOne({
      resetToken: tokenHash,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return { error: "Invalid or expired reset token" }
    }

    return { success: true, email: user.email }
  } catch (error: any) {
    logger.error("Verify reset token error:", error)
    return { error: "Failed to verify reset token" }
  }
}

export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return { error: "Token and new password are required" }
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  try {
    const usersCollection = await getCollection("users")

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    // Find user with this token and valid expiry
    const user = await usersCollection.findOne({
      resetToken: tokenHash,
      resetTokenExpiry: { $gt: new Date() },
    })

    if (!user) {
      return { error: "Invalid or expired reset token" }
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update user's password and remove reset token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      },
    )

    logger.info(`Password reset successful for user: ${user.email}`)
    return { success: true }
  } catch (error: any) {
    logger.error("Reset password error:", error)
    return { error: "Failed to reset password" }
  }
}





