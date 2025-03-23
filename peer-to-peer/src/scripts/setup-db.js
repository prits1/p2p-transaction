// This script helps set up the initial MongoDB collections
// Run with: node scripts/setup-db.js

const { MongoClient } = require("mongodb")
require("dotenv").config({ path: ".env.local" })

const uri = process.env.MONGODB_URI

if (!uri) {
  console.error("MONGODB_URI not found in environment variables")
  process.exit(1)
}

async function setupDatabase() {
  const client = new MongoClient(uri)

  try {
    await client.connect()
    console.log("Connected to MongoDB")

    const db = client.db()

    // Create collections if they don't exist
    const collections = ["users", "transactions", "messages", "disputes", "reviews"]

    for (const collectionName of collections) {
      const collectionExists = await db.listCollections({ name: collectionName }).hasNext()

      if (!collectionExists) {
        await db.createCollection(collectionName)
        console.log(`Created collection: ${collectionName}`)
      } else {
        console.log(`Collection already exists: ${collectionName}`)
      }
    }

    // Create indexes for better performance
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    console.log("Created unique index on users.email")

    await db.collection("transactions").createIndex({ "buyer.userId": 1 })
    await db.collection("transactions").createIndex({ "seller.userId": 1 })
    console.log("Created indexes on transactions")

    await db.collection("messages").createIndex({ transactionId: 1 })
    console.log("Created index on messages.transactionId")

    console.log("Database setup complete!")
  } catch (error) {
    console.error("Error setting up database:", error)
  } finally {
    await client.close()
  }
}

setupDatabase()

