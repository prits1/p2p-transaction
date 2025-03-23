import { MongoClient, ServerApiVersion } from "mongodb"

// Check for MongoDB URI in environment variables
if (!process.env.MONGODB_URI) {
  console.error("No MONGODB_URI found in environment variables")
  throw new Error("Please add your MongoDB URI to .env.local")
}

const uri = process.env.MONGODB_URI
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}

// Global variable to maintain connection across hot reloads
let client: MongoClient
let clientPromise: Promise<MongoClient>

// In development, use a global variable to preserve the connection
// across hot-reloads
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client
    .connect()
    .then((client) => {
      console.log("MongoDB connected successfully")
      return client
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err)
      throw err
    })
}
clientPromise = global._mongoClientPromise

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    return db.collection(collectionName)
  } catch (error) {
    console.error(`Failed to get collection ${collectionName}:`, error)
    throw error
  }
}

export default clientPromise



