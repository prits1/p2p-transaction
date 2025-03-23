"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ObjectId } from "mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

import { getCollection } from "@/lib/db"
import type { User } from "@/lib/models"

// Make sure JWT_SECRET is available
if (!process.env.JWT_SECRET) {
  console.error("No JWT_SECRET found in environment variables")
}

const JWT_SECRET = process.env.JWT_SECRET || "local-development-secret-key-change-in-production"
const COOKIE_NAME = "auth-token"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const role = formData.get("role") as string

  if (!email || !password || !name || !role) {
    return { error: "All fields are required in auth actipns" }
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

    // Create new user
    const newUser: User = {
      email,
      password: hashedPassword,
      name,
      role: role as "buyer" | "seller" | "admin",
      createdAt: new Date(),
      walletBalance: 0,
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
    ;(await
      // Set cookie
      cookies()).set({
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
      console.error("Login error: Email and password are required")
      return { error: "Email and password are required" }
    }

    console.log("Attempting to get users collection...")
    const usersCollection = await getCollection("users")
    console.log("Got users collection successfully")

    // Find user by email
    console.log(`Looking for user with email: ${email}`)
    const user = await usersCollection.findOne({ email })

    if (!user) {
      console.error(`Login error: User not found with email: ${email}`)
      return { error: "Invalid email or password" }
    }

    // Verify password
    console.log("Verifying password...")
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      console.error("Login error: Invalid password")
      return { error: "Invalid email or password" }
    }

    // Create JWT token
    console.log("Creating JWT token...")
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
    console.log("Setting auth token cookie...")
    ;(await cookies()).set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // false in development
      sameSite: "lax", // Changed from strict for local development
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log("Login successful")
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
export async function updateUserWallet(userId: string, amount: number) {
  try {
    if (!userId || typeof amount !== "number") {
      return { error: "Invalid parameters" }
    }

    const usersCollection = await getCollection("users")
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return { error: "User not found" }
    }

    const updatedBalance = (user.walletBalance || 0) + amount
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { walletBalance: updatedBalance } }
    )

    return { success: true, newBalance: updatedBalance }
  } catch (error) {
    console.error("Error updating wallet balance:", error)
    return { error: "Failed to update wallet balance" }
  }
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