// Debug endpoint to check environment variables and connections

import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/db"

export const dynamic = "force-dynamic" // No caching for this route

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    }

    // Test MongoDB connection
    let dbConnection = false
    let collections: string[] = []
    try {
      // Get MongoDB client directly
      const client = await clientPromise
      const db = client.db()

      // Try to get a document count to verify connection
      const usersCollection = db.collection("users")
      const userCount = await usersCollection.countDocuments({})
      dbConnection = true

      // Get list of collections
      const collectionsList = await db.listCollections().toArray()
      collections = collectionsList.map((col) => col.name)
    } catch (error) {
      console.error("MongoDB connection test failed:", error)
    }

    return NextResponse.json({
      status: "ok",
      environment: process.env.NODE_ENV,
      environmentVariables: envCheck,
      databaseConnection: dbConnection,
      collections: collections,
      nextjsVersion: "15.0.0",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}



