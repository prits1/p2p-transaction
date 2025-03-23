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
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect("/login")
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

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

